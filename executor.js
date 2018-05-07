var http = require('http');
var https = require('https');

class Executor {
	constructor(db) {
        this.db=db;
    } 
    
    RunTests() {
        //console.log("Running Tests");
        var collection = this.db.collection('Scripts', (err,theCollection)=>{
            theCollection.find().toArray((err, docs) => {
                if (err) {
                }
                else {
                    for (let index=0;index<docs.length;index++) this.runTest(docs[index]);
                }
            });
          });
    }
    parseURL(url)
    {
        let re=/(\S+)\s+http(s)?:\/\/([^:\/]+)(:(\d+))?(\S+)$/i
        let match = url.match(re);
        if (match)
        {
            let https = (typeof match[2]!== 'undefined');
            return {
                    'verb': match[1],
                    'https': https,
                    'server': match[3],
                    'port': (typeof match[5]!== 'undefined')?match[5]:(https?443:80),
                    'path': match[6]
            };
        }
        console.log('Bad Method '+url);
    }
    updateTest(oid,test)
    {
        this.db.collection('Scripts', (err,theCollection)=>{
            theCollection.update({'_id': oid},test,(err,result)=>{
                console.log("ERR:" + err)
            });
        });
    }
    testResults(test,iStep,statusCode,data)
    {
        return new Promise( (resolve,reject)=> {
            var now=new Date();
            var result={'dateTime':now.toISOString(),'content':data, 'test':test['_id']};
            var step = test.step[iStep];
            this.db.collection('Results', (err,theCollection)=>{
                if (step.expectedHttpCode!=statusCode)
                {
                    result.status='FAIL';
                    result.reason='Unexpected HTTP Status Code: '+statusCode;
                }
                else if (step.type=='acceptFirstResult' && (!step.expectedResult)) {
                    result.status='INITIALIZE';
                    test.step[iStep].expectedResult=data;
                    this.updateTest(test['_id'],test);
                }
                else if (step.type=='noTest')
                {
                    result.status='PASS';
                    result.reason = 'Content not tested';
                }
                else
                {
                    if (step.expectedResult==data) {
                        result.status='PASS';
                    }
                    else {
                        result.status='FAIL';
                        result.reason-'Content differs from expected results';
                    }
                }
                theCollection.insert(result,(err,result)=>{
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result.status!='FAIL');
                    }
                });

            });
        });
            console.log("DATA: " +data);


    }
    runStep(test,iStep)
    {
        return new Promise( (resolve,reject)=> {
            let methodParts = this.parseURL(test.step[iStep].method);
            let options = {
                hostname: methodParts.server,
                port: methodParts.port,
                path: methodParts.path,
                method: methodParts.verb
                };
            const req = http.request(options, (res) => {
                console.log(`STATUS: ${res.statusCode}`);
                console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
                res.setEncoding('utf8');
                let data='';
                res.on('data', (chunk) => {
                    data = data+chunk;
                });
                res.on('end', () => {
                    this.testResults(test,iStep,res.statusCode,data).then( (success) =>{
                        resolve(success);
                    });
                    
                });
            });
                
            req.on('error', (e) => {
            reject(e);
            });
            
            if (methodParts.verb==="PUT" || methodParts.verb==="POST")
            {
            req.write(test.step[iStep].content);
            }
            req.end();

        });
    }
    runNextStep(test,iStep)
    {
        console.log("RUNNING STEP: "+iStep);
        this.runStep(test,iStep).then( (success)=>{
            if (success && ++iStep<test.step.length) this.runNextStep(test,iStep);
        });
    }

    runTest(test) {
        if (test['status'] && test['status']==='active')
        {
            console.log("RUNNING TEST: "+test.name);
            this.runNextStep(test,0);
        }
    }

}

module.exports = Executor;