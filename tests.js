var mongo = require('mongodb');

class TestManager {
	constructor(db) {
        this.db=db;
       
    }
    
    AddTest(test) {
        var now = new Date();
        test.lastUpdatedDate=now.toISOString();
        return new Promise( (resolve,reject) => {
        var collection = this.db.collection('Scripts', (err,theCollection)=>{
            if (err) {
                    reject(err);
            }
            theCollection.insert(test,(err,result)=>{
                if (err) {
                    reject(err);
                }
                else {
                    resolve({code:202,content:null});
                }
            });
          });
        });
    }
    UpdateTest(test,id) {
        var now = new Date();
        test.lastUpdatedDate=now.toISOString();
        return new Promise( (resolve,reject) => {
        var collection = this.db.collection('Scripts', (err,theCollection)=>{
            if (err) {
                    reject(err);
            }
            var o_id = new mongo.ObjectID(id);

            theCollection.update({'_id': o_id},test,(err,result)=>{
                if (err) {
                    reject(err);
                }
                else {
                    resolve({code:202,content:null});
                }
            });
          });
        });
    }

    GetTest(id) {
        return new Promise( (resolve,reject) => {
            var collection = this.db.collection('Scripts', (err,theCollection)=>{
                if (err) {
                        reject(err);
                }
                var o_id = new mongo.ObjectID(id);

                theCollection.find(o_id).toArray((err, docs) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        if (docs.length===0) {
                            resolve({code:404,message:'Not Found'});
                        }
                        else{
                            resolve({code:200,content:JSON.stringify(docs[0])});
                        }
                        
                    }
                });
            });
        });
    }

    GetTests() {
        return new Promise( (resolve,reject) => {
            var collection = this.db.collection('Scripts', (err,theCollection)=>{
                if (err) {
                        reject(err);
                }
                theCollection.find().toArray((err, docs) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve({code:200,content:JSON.stringify(docs)});
                    }
                });
            });
        });

    }

    DeleteTest(id) {
        return new Promise( (resolve,reject) => {
            var collection = this.db.collection('Scripts', (err,theCollection)=>{
                if (err) {
                        reject(err);
                }
                var o_id = new mongo.ObjectID(id);

                theCollection.remove({'_id': o_id},(err, noDocs) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        if (noDocs===0) {
                            resolve({code:404,message:'Not Found'});
                        }
                        else{
                            resolve({code:204,message:'Test Deleted'});
                        }
                        
                    }
                });
            });
        });
    }
}

module.exports = TestManager;