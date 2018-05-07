var fs = require('fs');

/*
class Config {
	constructor(configPath='') {
        configPath=configPath==''?'config.json':configPath;
        this.config = JSON.parse(fs.readFileSync(configPath));
	}

}*/

function Config(configPath='') {
    configPath=configPath==''?'config.json':configPath;
    return JSON.parse(fs.readFileSync(configPath));

}

module.exports = Config;