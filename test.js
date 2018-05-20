
function deepSetJSONPath(at,path,root,val,obj)
{
    if (typeof obj != 'object') return false;

    var matched=false;
    if (typeof obj[at] != 'undefined')
    {
        if (path=='') 
        {
            obj[at]=val;
            matched=true;
        }
        else matched=setJSONOPath(path,root,val,obj[at]);
    }
    for (var i in obj)
    {
        if (typeof obj[at] == 'undefined')
            matched = matched | deepSetJSONPath(at,path,root,val,obj[i]);
    }
    return matched;
}

function arrayIndexFromExp(qualifier,avalue,length)
{
    avalue = (avalue==''?undefined:avalue);
    qualifier = (qualifier==''?undefined:qualifier);

    console.log("Qualifier: "+qualifier+ " avalue: "+avalue);

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

function expval(exp,obj)
{
    switch(exp.charAt(0))
    {
        case '@': return obj[exp.slice(1)];
        case '"': return exp.slice(1,-1);
        case '\'': return exp.slice(1,-1);
        case '/': return new RegExp(exp);
        default: return exp;
    }
}
function expevaluate(lhs,op,rhs)
{
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

function setJSONOArray(path,root,val,array)
{
    console.log("In setJSONOArray with path: "+path);

    var index;
    var matched=false;

    var m = path.match(/^\?\(([^\)]+)\)\]/);
    if (m)
    {
        var mexp = m[1].match(/(\S+)\s*(==|!=|>=|>|<=|<|=~)\s*(\S+)/);
        if (mexp)
        {
            path=path.slice(m[0].length);
            for (index=0;index<array.length;index++)
            {
                if (expevaluate(expval(mexp[1],array[index]),mexp[2],expval(mexp[3],array[index])))
                {
                    if (path=='')
                    {
                        array[index]=val;
                        matched=true;
                    }
                    else
                    {
                        matched = matched | setJSONOPath(path,root,val,array[index]);
                    }
                }

            }
            return
        }
    }
    var todo=[];

    while (1)
    {
        var m = path.match(/^(?:\*|((@length\-?|-)?(\d*))?(:((@length\-?|-)?(\d*))?)?)([\,\]])/);
        console.log(m);
        /*  m[1]=@length-123
            m[2]=@length-
            m[3]=123
            m[4]=:@length-123
            m[5]=@length-123
            m[6]=@length-
            m[7]=123
            m[8]=, */
        var min,max=0; 
        if (!m) throw "invalid JSONpath at: "+path;
        else if (m[0].charAt(0)=='*')
        {
            max=array.length;
        }
        else
        {
            min = arrayIndexFromExp(m[2],m[3],array.length);
            
            if (typeof min=='undefined')
            {
                if (typeof m[4]=='undefined') throw "invalid JSONpath at: "+path;
                min=0;
            }

            if (typeof m[4]=='undefined') max=min;
            else
            {
                max = arrayIndexFromExp(m[6],m[7],array.length);
                if (typeof max=='undefined') max=array.length-1;
            }
        }
        console.log("Min: "+min+" Max: "+max);

        for (index=Math.max(0,min);index<=Math.min(array.length,max);index++) todo[index]=true;
        path=path.slice(m[0].length);
        if (m[8]==']') break;
    }
    
    console.log(todo);
    for (index=0;index<=todo.length;index++) if (todo[index])
    {
        if (path=='')
        {
            array[index]=val;
            matched=true;
        }
        else
        {
            if (typeof array[index] == 'undefined') array[index] = new Object;
            matched = matched | setJSONOPath(path,root,val,array[index]);
        }
    }
    return matched;
}

function setJSONOPath(path,root,val,obj=null)
{
    console.log("In setJSONOPath with path: "+path);
    if (path.charAt(0)=='$')
    {
        obj=root;
        return setJSONOPath(path.slice(1),root,val,obj);
    }
    var m = path.match(/^\[|(\.\.|\.)([\$\w]+)/);
    if (!m) throw "invalid JSONpath at: "+path;
    console.log(m);
    path = path.slice(m[0].length);
    if (m[1]=='..') return deepSetJSONPath(m[2],path,root,val,obj);
    else if (m[1]=='.')
    {
        if (path=='')
        {
            console.log("setting value");
            obj[m[2]]=val;
            return true;
        }
        else
        {
            console.log("digging deeper");
            console.log(path);
            if (typeof obj[m[2]]!='undefined') return setJSONOPath(path,root,val,obj[m[2]]);
        }
    }
    else
    {
        // []
        if (Array.isArray(obj))
        {
           return setJSONOArray(path,root,val,obj);
        }
    }
    return false;
}


function analyseArray(o,ind)
{
    for (var i=0;i<o.length;i++)
    {
        if (typeof o[i] == 'object')
        {
            if (Array.isArray(o[i])) analyseArray(o[i],ind+'['+i+']');
            else analyseObject(o[i],ind+'['+i+'].');
        }
        else
        {
            console.log(ind+'['+i+']= '+o[i] + " ("+(typeof o[i])+")");
        }
        
    }

}

function analyseObject(o,ind)
{
    for (var i in o)
    {
        if (typeof o[i] == 'object')
        {
            if (Array.isArray(o[i])) analyseArray(o[i],ind+i);
            else analyseObject(o[i],ind+i+".");
        }
        else
        {
            console.log(ind+i+'= '+o[i] + " ("+(typeof o[i])+")");
        }
        
    }

}

var o = {'string':'myval',
                'number':123,
                'boolean':false,
                'array':[
                    {'deep':1},
                    {'deep':2,'param':'b'}
                ],
                'object':{
                    'prop1':1,
                    'prop2':2
                }
            };


setJSONOPath("$.array[?(@param=='b')].deep",o,456);
console.log(o);

