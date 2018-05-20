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

        var m = path.match(/^\?\(([^\)]+)\)\]/);
        if (m) {
            this.log("Testing expression: "+m[1]);
            var mexp = m[1].match(/(\S+)\s*(==|!=|>=|>|<=|<|=~)\s*(\S[\S\s]*)/);
            if (mexp) {
                this.log("Expression: "+ mexp[1]+" "+mexp[2]+" "+mexp[3]);
                path=path.slice(m[0].length);
                for (index=0;index<array.length;index++) {
                    if (this.expevaluate(this.expval(mexp[1],array[index]),mexp[2],this.expval(mexp[3],array[index]))) {
                        /*if (path=='') {
                            if (mode=='set') array[index]=val;
                            matched=matched.concat(array[index]);
                        } else if (path.match(/^\.[\$\w]+\(\)$/)) {
                            if (mode=='set') throw "Aggregation functions cannot be used in a set expression"
                            matched=matched.concat(array[index]);
                        } else {
                            matched=matched.concat(this.search(mode,path,root,val,array[index]));
                        }*/
                        matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,array,index));
                    }
                }
                return mode=='set'?matched.length>0:matched;
            }
        }
        var todo=[];

        while (1) {
            let m = path.match(/^(?:\*|((@length\-?|-)?(\d*))?(:((@length\-?|-)?(\d*))?)?)([\,\]])/);

            /*  m[1]=@length-123
                m[2]=@length-
                m[3]=123
                m[4]=:@length-123
                m[5]=@length-123
                m[6]=@length-
                m[7]=123
                m[8]=, */
            let min=0,max=0; 
            if (!m) throw "Invalid JSONPath at: "+path;
            else if (m[0].charAt(0)=='*') {
                this.log("Wild char search");
                max=array.length-1;
            } else {
                min = this.arrayIndexFromExp(m[2],m[3],array.length);
                
                if (typeof min=='undefined') {
                    if (typeof m[4]=='undefined') throw "Invalid JSONPath at: "+path;
                    min=0;
                }

                if (typeof m[4]=='undefined') max=min;
                else {
                    max = this.arrayIndexFromExp(m[6],m[7],array.length);
                    if (typeof max=='undefined') max=array.length-1;
                }
                this.log("Min-Max search: " +min+"-"+max);
            }
            this.log("Marking array elements: "+min+"-"+max);
            for (index=Math.max(0,min);index<=Math.min(array.length-1,max);index++) todo[index]=true;
            path=path.slice(m[0].length);
            if (m[8]==']') break;
        }
        this.log("Array walk with path: "+path);
        for (index=0;index<=todo.length;index++) if (todo[index]) {

            /*if (path=='') {
                this.log("Matched array element");
                if (mode=='set') array[index]=val;
                matched=matched.concat(array[index]);
            } else if (path.match(/^\.[\$\w]+\(\)$/)) {
                this.log("Aggregating array element");
                if (mode=='set') throw "Aggregation functions cannot be used in a set expression"
                matched=matched.concat(array[index]);
            } else
            {
                if (typeof array[index] == 'undefined') array[index] = new Object;
                matched=matched.concat(this.search(mode,path,root,val,array[index]));
            }*/
            matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,array,index));
        }
        return  mode=='set'?matched.length>0:matched;
    }

    static alternateSytaxObjectProp(mode,path,root,val,obj) {

        var matched=[];

        var m = path.match(/^\?\(([^\)]+)\)\]/);
        if (m) {
            var mexp = m[1].match(/(\S+)\s*(==|!=|>=|>|<=|<|=~)\s*(\S[\S\s]*)/);
            if (mexp) {
                this.log("Expression: "+ mexp[1]+" "+mexp[2]+" "+mexp[3]);
                path=path.slice(m[0].length);
                if (this.expevaluate(this.expval(mexp[1],obj),mexp[2],this.expval(mexp[3],obj))) {
                    matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,obj));
                }
                return mode=='set'?matched.length>0:matched;
            }
        }
       
        m = path.match(/^(?:\*|(['"])([\$\w]+)\1)\]/);

        /*  m[1]='
            m[2]=prop */
        if (m) {
            path=path.slice(m[0].length);
            if (m[0].charAt(0)=='*') {
                this.log("Wild char property");
                for (let index in obj) {
                    matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,obj,index));
                }
            }
            else
            {
                this.log("Property match: "+m[2]);
                if (typeof obj[m[2]] != 'undefined') {
                    matched=matched.concat(this.captureOrMoveOn(mode,path,root,val,obj,m[2]));
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
            if (path=='') {
                if (mode=='set') obj[at]=val;
                matched=matched.concat(obj[at]);
            } else if (path.match(/^\.[\$\w]+\(\)$/)) {
                if (mode=='set') throw "Aggregation functions cannot be used in a set expression"
                matched=matched.concat(obj[at]);
            } else matched=matched.concat(this.search(mode,path,root,val,obj[at]));
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

        let m = path.match(/^\[|(\.\.|\.)([\$\w]+)/);
        if (!m) throw "Invalid JSONPath at: "+path;

        path = path.slice(m[0].length);
        if (m[1]=='..') return  this.deepSearch(mode,m[2],path,root,val,obj);
        else if ((m[1]=='.') && (typeof obj[m[2]]!='undefined') ) {
            /*if (path=='') {
                if (mode=='set') {
                    obj[m[2]]=val;
                    return true;
                }
                return [obj[m[2]]];
            }
            else if (path.match(/^\.[\$\w]+\(\)$/)) {
                if (mode=='set') throw "Aggregation functions cannot be used in a set expression"
                return [obj[m[2]]];
            }
            else {
                return  this.search(mode,path,root,val,obj[m[2]]);
            }*/
            return  this.captureOrMoveOn(mode,path,root,val,obj,m[2]);
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