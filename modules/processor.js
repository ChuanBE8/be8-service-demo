"use strict";

let readline = require('readline'),
	fs = require('fs'),
	fileName = 'dictionary.txt',
	session = {},
	messenger = require('./messenger'),
	utterances = [];

const rl = readline.createInterface({
	input : fs.createReadStream(fileName)
});

rl.on('line', (line) => {
	var index = line.indexOf(' ');
	if(index > 0){
		var handler = line.substring(0, index);
		var utterance = line.substring(index + 1);
		utterances.push({utterance: utterance, handler: handler});
	}
});

rl.on('close', () => {
	console.log('End of file');
}); 

let match = text => {
	console.log('globalSession.id',globalSession.id)
	// if(globalSession && globalSession.id){
	// 	console.log('Processor session %j', globalSession);
	// 	console.log('Processor sequence: ' + globalSequence);
	// 	console.log('Processor text: ' + text);
	// 	var handler = 'liveAgentMessage';
	// 	var match = [];
	// 	match.push(text);
	// 	return {handler, match};
	// }
	// else{
	// 	console.log('No session ');
	// 	messenger.getLiveAgentSession().then(session => {
	// 		console.log("Session %j", session);
	// 		// console.log("Values " + values[1]);
	// 		var key = session.key;
	// 		console.log("key: " + key);
	// 		messenger.chasitorInit(session.key, session.affinityToken, session.id).then(chasitor => {
	// 			console.log("Chasitor %j", chasitor);
	// 			console.log("Chasitor Session %j", session);
	// 			globalSession = session;
	// 			globalSequence = -1;
				
	// 			var handler = 'liveAgentMessage';
	// 			var match = [];
	// 			match.push(text);
	// 			return {handler, match};
	// 		});
	// 	});
	// }
	for(var i = 0; i<utterances.length; i++){
		var match = text.match(new RegExp(utterances[i].utterance, 'i'));
		if(match){
			var handler = utterances[i].handler;
			return {handler, match};
		} 
		else{
			console.log('No match');
		}
	}
};

exports.match = match;
exports.session = session;