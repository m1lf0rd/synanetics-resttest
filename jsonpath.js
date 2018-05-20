class JSONPath {

    // One of two main entry points to JSONPath functionality. This one takes a path such as
    //      $.books[1].stock[*].edition    or
    //      $.books[?(@author='J D Salinger')].stock[*].price.avg()
    // and retuns either an array of matching properties or a single scalar representimng the result of an aggregation
    static Get(path,obj) {
        let matched = this.search('get',path,obj);
        let m = path.match(/\.([\$\w]+)\(\)$/);
        if (m) {
            return this.aggregate(m[1],matched);
        }
        return matched;
    }

    // One of two main entry points to JSONPath functionality. This one takes a path such as
    //      $.books[1].stock[*].edition    
    // and sets every occurance of properties in the passed object gragh that matches the path to the provided value
    static Set(path,obj,val) {
        return this.search('set',path,obj,val);
    }
    

    static BeNoisy(noisy) {JSONPath.noisy = noisy};

    static log(val)
    {
        if (JSONPath.noisy) console.log(val);
    }

    // Helper function to turn an array result from a regular expression match into a names set of properties on an object.
    // It just helps with code interpretation
    static explainMatch(m,aVals)
    {
        if (!m) return m;
        let explain={'matched':m[0]};
        for (let i=0;i<aVals.length;i++)
        {
            if (typeof aVals[i]!='undefined'){
                explain[aVals[i]]=m[i+1];
            }
        }
        return explain;
    }

    // Called if a GET path ends in an agregator function. The standard GET processing results in an array of values.
    // This function is called in post processing
    static aggregate(op,array)
    {
        if (op=='length') return array.length;
        let retval='';
        let avgsqd=0;
        for (let i=0;i<array.length;i++) {
            let val=0+array[i];
            switch (op)
            {
                case 'min': retval=(retval==''?val:Math.min(val,retval)); break;
                case 'max': retval=(retval==''?val:Math.max(val,retval)); break;
                case 'avg': retval=(retval==''?0:retval)+val/array.length; break;
                case 'std': {retval=(retval==''?0:retval)+val/array.length; avgsqd = avgsqd+Math.pow(val,2)/array.length}; break;
                case 'sum': retval=(retval==''?0:retval)+val; break;
            }
        }
        if (op=='std') 
        {
            this.log("std: "+avgsqd+" "+retval);
            return Math.sqrt(avgsqd-Math.pow(retval,2));
        }
        this.log("Aggregated value: "+retval);
        return retval;
    }

    // Called whenever there is a match in the path to current point in the object graph
    // If we are at the end of the path then capture, or set the property value, otherwish move forward
    // When determining that we are at the end of the path we need to antipate trailing aggregators such as .avg() 
    static captureOrMoveOn(mode,path,root,val,obj,index) {
        this.log("Capture or Move On");
        var nextobj= (typeof index == 'undefined')?obj:obj[index];
        if (path=='') {
            if (mode=='set') 
            {
                if (typeof index == 'undefined') throw "Invalid set operation";
                obj[index]=val;
            }
            this.log("Capturing: " + nextobj);
            return [nextobj];
        } else if (path.match(/^\.[\$\w]+\(\)$/)) {  // look for a training aggregator
            if (mode=='set') throw "Aggregation functions cannot be used in a set expression"
            this.log("Capturing for aggregation: " + nextobj);
            return [nextobj];
        } else {
            this.log("Moving onto " + path);
            return this.search(mode,path,root,val,nextobj);
        }
    }

    // Helper function to turn a regular expression match such as @length-2 into an array index
    // Examples of supported constructs include: 1, @length, -1, @length-1
    static arrayIndexFromExp(qualifier,avalue,length) {
        avalue = (avalue==''?undefined:avalue);
        qualifier = (qualifier==''?undefined:qualifier);

        this.log("Qualifier: "+qualifier+ " avalue: "+avalue);

        if (qualifier=='@length')
        {
            if (typeof avalue=='undefined') return length;
            else throw "Invalid length expression";
        }
        if (typeof qualifier!='undefined')
        {
            if (typeof avalue!='undefined') return length-avalue;
            else throw "Invalid length expression";
        }
        return avalue;
    }

    // Helper function to turn the lhs or rhs of an expression into a primitive datatype 
    static expval(exp,obj) {
        switch(exp.charAt(0))
        {
            case '@': return obj[exp.slice(1)]; 
            case '"': return exp.slice(1,-1); 
            case '\'': return exp.slice(1,-1); 
            case '/': return new RegExp(exp);
            default: return exp;
        }
    }
    // Helper function to evaluate an expression in a conditional match
    static expevaluate(lhs,op,rhs) {
        switch (op)
        {
            case '==': return (lhs==rhs);
            case '!=': return (lhs!=rhs);
            case '>=': return (lhs>=rhs);
            case '>': return (lhs>rhs);
            case '<=': return (lhs<=rhs);
            case '<': return (lhs<rhs);
            case '=~': return !!lhs.toString().match(rhs);
        }
    }
    // Entered when an expression like [...] is found in the path and teh current object is an array. 
    // On entry path points to the character after [
    // Two processing varients are supported:
    //      [?(expression)] - if expression evaluates to true  in the context of a member of the array then
    //          processing continues with that member in context
    //      [1:3,:@length-1,-2:] - the comma separated bounds definitions are aggregated and processing continues
    //          with each indexed array member in context
    static searchArray(mode,path,root,val,array) {

        var index;
        var matched=[];

        let m = this.explainMatch(path.match(/^\?\(([^\)]+)\)\]/), // looks for ?(expression)] - note the weakness if teh expression contains a string with )]
                ['expression']);
        if (m) {
            this.log("Testing expression: "+m.expression); //1
            var mexp = this.explainMatch(m.expression.match(/(\S+)\s*(==|!=|>=|>|<=|<|=~)\s*(\S[\S\s]*)/) // breaks the found expression into lhs op rhs
                ,['lhs','op','rhs']); //1
            if (mexp) {
                this.log("Expression: "+ mexp.lhs+" "+mexp.op+" "+mexp.rhs);  
                path=path.slice(m.matched.length); 
                for (index=0;index<array.length;index++) {
                    if (this.expevaluate(this.expval(mexp.lhs,array[index]),mexp.op,this.expval(mexp.rhs,array[index]))) { 
                        matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,array,index));
                    }
                }
                return mode=='set'?matched.length>0:matched;
            }
        }
        var todo=[];  //go through each of the comma delimitted bounds definitions in tur building an array of the input array elements to be processed
                     

        while (1) {
            let m = this.explainMatch(path.match(/^(?:\*|((@length\-?|-)?(\d*))?(:((@length\-?|-)?(\d*))?)?)([\,\]])/), // breaks down expressions like :99, @length-1, 1:-3
                    [,'fromEnd','fromCount','toDef','','toEnd','toCount','contChar']);

            let min=0,max=0; 
            if (!m) throw "Invalid JSONPath at: "+path;
            else if (m.matched.charAt(0)=='*') { 
                this.log("Wild char search");
                max=array.length-1;
            } else {
                min = this.arrayIndexFromExp(m.fromEnd,m.fromCount,array.length); 
                
                if (typeof min=='undefined') {
                    if (typeof m.toDef=='undefined') throw "Invalid JSONPath at: "+path; 
                    min=0;
                }

                if (typeof m.toDef=='undefined') max=min; 
                else {
                    max = this.arrayIndexFromExp(m.toEnd,m.toCount,array.length); 
                    if (typeof max=='undefined') max=array.length-1;
                }
                this.log("Min-Max search: " +min+"-"+max);
            }
            this.log("Marking array elements: "+min+"-"+max);
            for (index=Math.max(0,min);index<=Math.min(array.length-1,max);index++) todo[index]=true;
            path=path.slice(m.matched.length); 
            if (m.contChar==']') break;  // no more comma delimitted parts
        }
        this.log("Array walk with path: "+path);
        for (index=0;index<=todo.length;index++) if (todo[index]) {

            matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,array,index));
        }
        return  mode=='set'?matched.length>0:matched;
    }

    // Called when the path looks like [expression] and is being evaluated on an object
    // Two syntactical variations are supported:
    //  [?(lhs op rhs)] - the property matches and if the given expression evaluates to true then the path 
    //          is processed further in the context of the current object
    //  ['property'] - if the property exists then the path is processed further in teh context of the property
    static alternateSytaxObjectProp(mode,path,root,val,obj) {

        var matched=[];

        var m = this.explainMatch(path.match(/^\?\(([^\)]+)\)\]/), // looks for ?(....)]. Note the weekness - if )] is included in a string in the exopression then it will halt the match
                ['expression']);
        if (m) {
            var mexp = this.explainMatch(m.expression.match(/(\S+)\s*(==|!=|>=|>|<=|<|=~)\s*(\S[\S\s]*)/), // breaks the found expression into lhs op rhs
                    ['lhs','op','rhs']); 
            if (mexp) {
                this.log("Expression: "+ mexp.lhs+" "+mexp.op+" "+mexp.rhs); 
                path=path.slice(m[0].length);
                if (this.expevaluate(this.expval(mexp.lhs,obj),mexp.op,this.expval(mexp.rhs,obj))) { 
                    matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,obj));
                }
                return mode=='set'?matched.length>0:matched;
            }
        }
       
        m = this.explainMatch(path.match(/^(?:\*|(['"])([\$\w]+)\1)\]/),  // looks for either *] or 'property'] - ' and " are suppported"
                [,'property']);
        
        if (m) {
            path=path.slice(m.matched.length); 
            if (m.matched.charAt(0)=='*') { 
                this.log("Wild char property");
                for (let index in obj) {
                    matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,obj,index));
                }
            }
            else
            {
                this.log("Property match: "+m.property); 
                if (typeof obj[m.property] != 'undefined') {
                    matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,obj,m.property)); 
                }
            }
        } 
        return  mode=='set'?matched.length>0:matched;
    }

    // Recursive fuction for finding all occurances of a property below the current point in an object graph
    static deepSearch(mode,at,path,root,val,obj) {
        if (typeof obj != 'object') return mode=='set'?false:[];

        var matched=[];
        if (typeof obj[at] != 'undefined')
        {
            matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,obj,at)); 
        }
        for (var i in obj)
        {
            if (i!=at)
                matched=matched.concat(this.deepSearch(mode,at,path,root,val,obj[i]));
        }
        return  mode=='set'?matched.length>0:matched;
    }
    // Recursive function to move through a path and match to successive depths in an object graph
    // An expression is processed in sections as follows:
    // .books[1:2]['stock']..price
    // |     |    |        |
    // |     |    |        deepSearch
    // |     |    alternateSyntaxObjectProp
    // |     searchArray
    // search
    //
    // Recursion back into search is performed by captureAndMoveOn
    // This function 'looks ahead' to enure that it doesn't attempt to treat a training aggregation function
    // as an object property. There is one special case whereby the root object is an array and the aggregation function
    // is the only expression in the path. The agregation is detected here and the path reformulated to allow the
    // calculation to be perfoemd in searchArray
    static search(mode,path,root,val,obj=null) {
        this.log("In search with path: "+path)
        if (path.charAt(0)=='$') {
            obj=root;
            return this.search(mode,path.slice(1),root,val,obj);
        }
        if (typeof obj == 'undefined') return (mode=='set'?false:[]);

        if (path.match(/^\.[\$\w]+\(\)$/)) {
            // Special case: aggregation function detected operating on root object
            if (mode=='set') throw "Aggregation functions cannot be used in a set expression"
            return this.searchArray(mode,"*]"+path,root,val,obj);
        }

        let m = this.explainMatch(path.match(/^\[|(\.\.|\.)([\$\w]+)/), // looks for .property, ..property or [expression
                ['type','property']);
        if (!m) throw "Invalid JSONPath at: "+path;

        path = path.slice(m.matched.length);
        if (m.type=='..') return  this.deepSearch(mode,m.property,path,root,val,obj); 
        else if ((m.type=='.') && (typeof obj[m.property]!='undefined') ) { 
            return  this.captureOrMoveOn(mode,path,root,val,obj,m.property); 
        }
        else {
            // []
            if (Array.isArray(obj))
            {
               return  this.searchArray(mode,path,root,val,obj);
            }
            else
            {
                return this.alternateSytaxObjectProp(mode,path,root,val,obj);
            }
        }
        return mode=='set'?false:[];
    }


}
JSONPath.noisy=false;

module.exports = JSONPath;