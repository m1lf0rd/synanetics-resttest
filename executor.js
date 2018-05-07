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
    runTest(test) {
        //console.log("Running "+test.name);

    }

}

module.exports = Executor;