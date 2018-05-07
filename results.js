var mongo = require('mongodb');

class ResultsManager {
	constructor(db) {
        this.db=db;
       
    }

    GetResults(testid,latest)
    {
        return new Promise( (resolve,reject) => {
            var collection = this.db.collection('Results', (err,theCollection)=>{
                if (err) {
                        reject(err);
                }
                var o_id = new mongo.ObjectID(testid);
                if (latest)
                {
                    theCollection.findOne({'test':o_id},{'sort':[['dateTime','descending']]}, (err, doc) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve({code:200,content:JSON.stringify(doc)});
                        }
                    });

                }
                else
                {
                    theCollection.find({'test':o_id}).toArray((err, docs) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve({code:200,content:JSON.stringify(docs)});
                        }
                    });
                }
            });
        });




    }

    
}
module.exports = ResultsManager;