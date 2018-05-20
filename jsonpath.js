class JSONPath {
    static Get(path,obj) {
        let matched = this.search('get',path,obj);
        let m = path.match(/\.([\$\w]+)\(\)$/);
        if (m) {
            return this.aggregate(m[1],matched);
        }
        return matched;
    }

    static Set(path,obj,val) {
        return this.search('set',path,obj,val);
    }
    

    static BeNoisy(noisy) {JSONPath.noisy = noisy};

    static log(val)
    {
        if (JSONPath.noisy) console.log(val);
    }

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
                case 'std': {retval=(retval==''?0:retval)+val/array.length; avgsqd = Math.pow(val,2)/array.length}; break;
                case 'sum': retval=(retval==''?0:retval)+val; break;
            }
        }
        if (op=='std') return Math.sqrt(avgsqd-Math.pow(retval,2));
        this.log("Aggregated value: "+retval);
        return retval;
    }

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
        } else if (path.match(/^\.[\$\w]+\(\)$/)) {
            if (mode=='set') throw "Aggregation functions cannot be used in a set expression"
            this.log("Capturing for aggregation: " + nextobj);
            return [nextobj];
        } else {
            this.log("Moving onto " + path);
            return this.search(mode,path,root,val,nextobj);
        }
    }

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

    static searchArray(mode,path,root,val,array) {

        var index;
        var matched=[];

        let m = this.explainMatch(path.match(/^\?\(([^\)]+)\)\]/),
                ['expression']);
        if (m) {
            this.log("Testing expression: "+m.expression); //1
            var mexp = this.explainMatch(m.expression.match(/(\S+)\s*(==|!=|>=|>|<=|<|=~)\s*(\S[\S\s]*)/)
                ,['lhs','op','rhs']); //1
            if (mexp) {
                this.log("Expression: "+ mexp.lhs+" "+mexp.op+" "+mexp.rhs);  //1,2,3
                path=path.slice(m.matched.length); //0
                for (index=0;index<array.length;index++) {
                    if (this.expevaluate(this.expval(mexp.lhs,array[index]),mexp.op,this.expval(mexp.rhs,array[index]))) { //1,2,3
                        matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,array,index));
                    }
                }
                return mode=='set'?matched.length>0:matched;
            }
        }
        var todo=[];

        while (1) {
            let m = this.explainMatch(path.match(/^(?:\*|((@length\-?|-)?(\d*))?(:((@length\-?|-)?(\d*))?)?)([\,\]])/),
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
            if (m.contChar==']') break; 
        }
        this.log("Array walk with path: "+path);
        for (index=0;index<=todo.length;index++) if (todo[index]) {

            matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,array,index));
        }
        return  mode=='set'?matched.length>0:matched;
    }

    static alternateSytaxObjectProp(mode,path,root,val,obj) {

        var matched=[];

        var m = this.explainMatch(path.match(/^\?\(([^\)]+)\)\]/),
                ['expression']);
        if (m) {
            var mexp = this.explainMatch(m.expression.match(/(\S+)\s*(==|!=|>=|>|<=|<|=~)\s*(\S[\S\s]*)/),
                    ['lhs','op','rhs']); //1
            if (mexp) {
                this.log("Expression: "+ mexp.lhs+" "+mexp.op+" "+mexp.rhs); //1,2,3
                path=path.slice(m[0].length);
                if (this.expevaluate(this.expval(mexp.lhs,obj),mexp.op,this.expval(mexp.rhs,obj))) { //1,2,3
                    matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,obj));
                }
                return mode=='set'?matched.length>0:matched;
            }
        }
       
        m = this.explainMatch(path.match(/^(?:\*|(['"])([\$\w]+)\1)\]/),
                [,'property']);

        if (m) {
            path=path.slice(m.matched.length); // 0
            if (m.matched.charAt(0)=='*') { // 0 
                this.log("Wild char property");
                for (let index in obj) {
                    matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,obj,index));
                }
            }
            else
            {
                this.log("Property match: "+m.property); // 2
                if (typeof obj[m.property] != 'undefined') {
                    matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,obj,m.property)); //2
                }
            }
        } 
        return  mode=='set'?matched.length>0:matched;
    }


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
                matched=matched.concat(this,deepSearch(mode,at,path,root,val,obj[i]));
        }
        return  mode=='set'?matched.length>0:matched;
    }

    static search(mode,path,root,val,obj=null) {
        this.log("In search with path: "+path)
        if (path.charAt(0)=='$') {
            obj=root;
            return this.search(mode,path.slice(1),root,val,obj);
        }
        if (typeof obj == 'undefined') return (mode=='set'?false:[]);

        let m = this.explainMatch(path.match(/^\[|(\.\.|\.)([\$\w]+)/),
                ['type','property']);
        if (!m) throw "Invalid JSONPath at: "+path;

        path = path.slice(m.matched.length); //0
        if (m.type=='..') return  this.deepSearch(mode,m[2],path,root,val,obj); //1
        else if ((m.type=='.') && (typeof obj[m.property]!='undefined') ) { //1,2

            return  this.captureOrMoveOn(mode,path,root,val,obj,m.property); // 2
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