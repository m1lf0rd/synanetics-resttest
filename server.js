var http = require('http');

class RestHandler {
	constructor() {
		if (new.target === RestHandler) {
			throw new TypeError('Cannot construct RestRequest instances directly');
		}
	}
	
	Execute() {
		throw new TypeError('RestRequest.execute() is abstract');
	}
}

class RoutedRequest extends RestHandler {
	constructor(handler, params,queryparams,content={}) {
		super();

		this.handler = handler;
        this.params = params;
        this.queryparams=queryparams;
        this.content = content;
	}

	
	Execute() {
        return  this.handler(this.params,this.queryparams,this.content);
        let This=this;
        return new Promise( (resolve,reject) => {
            console.log("Executing handler");
            let response = This.handler(This.params,This.queryparams,This.content);
            resolve(response);
            /*Promise.resolve(response).then((response) => {
                            resolve(response);
                        }, (err) => {
                            reject(err);
            });*/
        });
    }
}

class RestServer {
	constructor(){
        this.services = "";
        this.routes=[];
    }
    RunService(port) {
        let This = this;
		http.createServer((httpRequest, httpResponse) => This.handler(httpRequest, httpResponse)).listen(port);
		console.log('Test harness running at port ' + port);
    }
    AddRoute(method,path,func) {
        this.routes.push({method: method, path: path, func: func});

    }

	handler(httpRequest, httpResponse) {
		let This = this;
		
		this.parse(httpRequest)
		.then(  (request) =>  request.Execute(),
		        (exception) => { 
                    console.log("Error");
                    This.respond(httpResponse, exception);
                })
        .then(  (response) => {
			        console.log('Request [' + httpRequest.url + '], response: '+response);
			        This.respond(httpResponse, response);
		        }, 
		        (exception) => {
			        console.error('Request [' + httpRequest.url + '], error: ');
			        console.error(exception);

			        This.respond(httpResponse, exception);
		        })
		.catch((err) => {
			console.error('Request [' + httpRequest.url + '], catch: ');
			console.error(err);

			let error = This.getError(500, 'Internal server error');
			This.respond(httpResponse, error);
		});
	}
	
	respond(httpResponse, response) {
        let code = (response['code'])?response.code:500;
        let content = (response['content'])?response.content:null;
        let message = (response['message'])?response.message:null;
        let contentType = (response['contentType'])?response.contentType:null;

        let headers={};
        if (content)
        {
            let headers={'Content-Type':contentType?contentType:'application/json'};
        }
        httpResponse.writeHead(code,message,headers);
        httpResponse.end(content);
	}
	
	parse(httpRequest) {
		let This = this;
		
		return new Promise((resolve, reject) => {
            
            let method = httpRequest.method.toUpperCase();
            
            if(method === 'POST' || method === 'PUT' || method === 'PATCH') {
                if (httpRequest.headers['content-type'].toLowerCase().indexOf('application/json') !== 0) {
                    throw this.getError('BAD_CONTENT_TYPE', 'Content type not supported:' + httpRequest.headers['content-type'], {
						request : ''
					});
                }
				let queryData = '';
				httpRequest.on('data', function(data) {
		            queryData += data;
		        });

				httpRequest.on('end', function() {
					let params = JSON.parse(queryData);
					try{
    					let request = This.parsePathParams(method,httpRequest.url,JSON.parse(queryData));
    					resolve(request);
					}
					catch(e) {
						reject(e);
					}
		        });
			}
			else {
				try{
					let request = This.parsePathParams(method,httpRequest.url);
					resolve(request);
				}
				catch(e) {
					reject(e);
				}
			}
		});
	}
    prepareMatch(path) 
    {
            let params = path.match(/\/:([^\/]*)/gi);
            let expression = new RegExp(path.replace(/\/:[^\/]*/gi,'\/([^\/]*)')+'$','i');
        	return {params: params===null?[]:params,  expression:expression};
    }
	
	parsePathParams(method,uri,body) {
        let uriparts=uri.split('?');
        
        let queryparts=(uriparts.length>0)?uriparts[1].split('&'):[];
        
        let queryparams=[];
        for (let iQuery in queryparts)
        {
            let querypair=queryparts[iQuery].split('=');
            queryparams[querypair[0]]=querypair[1];
            
        }

        for (let index=0;index<this.routes.length;index++) {
            console.log("Matching: "+this.routes[index].method.toUpperCase()+" "+this.routes[index].path+" to "+method.toUpperCase()+" "+uri);    ;                    
            if (this.routes[index].method.toUpperCase()===method.toUpperCase()) {
                let matcher = this.prepareMatch(this.routes[index].path);
                let matches = uriparts[0].match(matcher.expression);
                if (matches !== null && matches.length === matcher.params.length+1) {
                    let params = [];
                    for (let iParam=0;iParam<matcher.params.length;iParam++) {
                        params[matcher.params[iParam].substr(2)]=matches[iParam+1];
                    }
                    console.log("Match");
                    return new RoutedRequest(this.routes[index].func,params,queryparams,body);
                }
                else
                {
                    console.log(uri+" doesn't match "+matches);
                }
            }
            else
            {
                console.log("Methods don't match");
            }
        }
	
	}
	
	getError(code, message, args) {
		return {
			code : code,
            message : message,
			parameters: args
		};
	}
}

module.exports = RestServer;