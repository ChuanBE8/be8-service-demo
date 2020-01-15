"use strict";

let //salesforce = require('./salesforce'), 
	messenger = require('./messenger'),
	// formatter = require('./formatter'),
	postbacks = require('./postbacks');
// var spawn = require('child_process').spawn;
var rut;
var contacto;

exports.hi = (sender) => {
	messenger.getUserInfo(sender).then(response => {
		messenger.botSend({text : `Yo ${response.first_name}!`}, sender);
	});
};
exports.howAreYou = (sender) => {
	messenger.botSend({text : `Fine ei ei`}, sender);
};

exports.lineTalkToAgent = (current_session, msg) => {
	messenger.sendLAMessage(current_session, msg);
}

exports.fbTalkToAgent = (current_session, msg) => {
	messenger.sendLAMessage(current_session, msg);
}

exports.fbStopAgent = (current_session, msg) => {
	current_session.lineSession.talkToAgent = false;
	current_session.liveagentSession.agentQueue = null;
	messenger.sendLAEnd(current_session, "EndedByClient");
}

exports.lineStopAgent = (client, current_session, msg) => {
	current_session.lineSession.talkToAgent = false;
	current_session.liveagentSession.agentQueue = null;
	messenger.sendLAEnd(current_session, "EndedByClient");
}

exports.fbStartAgent = async (current_session, msg) => {
	var userProfile = await messenger.getUserInfo(current_session.fbSession.userId);
	current_session.fbSession.displayName = userProfile.first_name + ' ' + userProfile.last_name;
	messenger.send({text : `Hang on a sec.`}, current_session);
	messenger.getLiveAgentSession().then(session => {
		console.log("Session %j", session);
		current_session.liveagentSession.id = session.id;
		current_session.liveagentSession.key = session.key;
		current_session.liveagentSession.affinityToken = session.affinityToken;
		current_session.liveagentSession.pollTimeout = session.clientPollTimeout;
		current_session.liveagentSession.initialFetchTime = Date.now();
		current_session.liveagentSession.currentFetchTime = Date.now();

		messenger.chasitorInit(
			current_session.liveagentSession.key,
			current_session.liveagentSession.affinityToken,
			current_session.liveagentSession.id,
			current_session.fbSession
		).then(chasitor => {
			console.log("Chasitor %j", chasitor);
			console.log("Chasitor Session %j", session);
			//-1 for init
			current_session.liveagentSession.sequence = -1;
			current_session.liveagentSession.timer = null;

    		function initialPooling(current_session){
    			estabishedLp(current_session);
    		};

    		function estabishedLp(current_session){
    			messenger.messages(current_session.liveagentSession, current_session.sequence).then(newmsg =>{
    				
    				//code 204
    				if(newmsg==''){

    					var diffFromCurrent = (Date.now() - current_session.liveagentSession.currentFetchTime)/1000;

    					var deadlineTime = (current_session.liveagentSession.warningTime)?
    										current_session.liveagentSession.warningTime:
    										current_session.liveagentSession.connectionTimeout;
						console.log('diff v dead',diffFromCurrent,deadlineTime);
    					if(diffFromCurrent > deadlineTime){
    						current_session.fbSession.talkToAgent = false;
	    					current_session.liveagentSession.agentQueue = null;
	    					messenger.send({text : `Thank you for conversation. Have a nice day.`}, current_session);
	    					messenger.sendLAEnd(current_session, "timeout");
    					}else{
    						initialPooling(current_session);
    					}

    				}else {

    					current_session.liveagentSession.currentFetchTime = Date.now();
	    				var newmsg_json = JSON.parse(newmsg);
	    				
	    				if(newmsg_json.messages[0].type == 'ChatRequestSuccess'){
							console.log('ChatRequestSuccess');
							//update sequence
							//can check queue here 1 = 0 queue
							current_session.liveagentSession.connectionTimeout = newmsg_json.messages[0].message.connectionTimeout;
	    					current_session.liveagentSession.sequence = newmsg_json.sequence;
	    					initialPooling(current_session);
	    				}
	    				else if(newmsg_json.messages[0].type == 'ChatEstablished'){
							console.log('ChatEstablished');
							let chasitorInfo = newmsg_json.messages[0].message;
							console.log(chasitorInfo);
							current_session.liveagentSession.warningTime = chasitorInfo.chasitorIdleTimeout.warningTime;
							current_session.liveagentSession.timeout = chasitorInfo.chasitorIdleTimeout.timeout;
							messenger.send({text : `Hello, This is Agent ${chasitorInfo.name}. How may I help you?`}, current_session);
							initialPooling(current_session);
	    				}
	    				else if(newmsg_json.messages[0].type == 'QueueUpdate'){
							console.log('QueueUpdate');
							// message
							// setTimeout(function() {
								// console.log('timeout',current_session);
								initialPooling(current_session);
							// }, 2000);
	    				}
	    				else if(newmsg_json.messages[0].type == 'ChatMessage' || newmsg_json.messages.length > 1){
							console.log('ChatMessage');
							current_session.liveagentSession.sequence = newmsg_json.sequence;

							var tmpmsg = [];
							// for(var mess in newmsg_json.messages){
							for (var i = 0; i < newmsg_json.messages.length; ++i) {
								if(newmsg_json.messages[i].type == 'ChatMessage'){
									tmpmsg.push({
	    								text: newmsg_json.messages[i].message.text
									});
								}
							}
							console.log('current tmpmsg',tmpmsg);
							messenger.send(tmpmsg, current_session);
							initialPooling(current_session);
	    				}
	    				else if(newmsg_json.messages[0].type == 'ChatEnded'){
							console.log('ChatEnded');
							current_session.fbSession.talkToAgent = false;
							current_session.liveagentSession.agentQueue = null;
							messenger.send({text : `Thank you for conversation. Have a nice day.`}, current_session);
	    				}
	    				else if(newmsg_json.messages[0].type == 'ChatRequestFail'){
							console.log('ChatRequestFail');
							current_session.fbSession.talkToAgent = false;
							current_session.liveagentSession.agentQueue = null;
							messenger.send({text : `No Agent Available.`}, current_session);
	    				}
	    				else if(newmsg_json.messages[0].type == 'AgentTyping'){
							console.log('AgentTyping');
							initialPooling(current_session);
	    				}
	    				else if(newmsg_json.messages[0].type == 'AgentNotTyping'){
							console.log('AgentNotTyping');
							initialPooling(current_session);
	    				}
	    			}
    			}).catch((err)=>{
    				console.log('err',err);
    			});
    		};
    		initialPooling(current_session);
    		// }, 2000);

			// message(globalSession, globalSequence, sender);
		});
	});
};

exports.lineStartAgent = async (client, current_session, msg) => {
	var userProfile = await messenger.getLineUserInfo(client, current_session.lineSession.userId);
	current_session.lineSession.displayName = userProfile.displayName;
	messenger.line_send(client, `Hang on a sec.`, current_session);
	messenger.getLiveAgentSession().then(session => {
		console.log("Session %j", session);
		current_session.liveagentSession.id = session.id;
		current_session.liveagentSession.key = session.key;
		current_session.liveagentSession.affinityToken = session.affinityToken;
		current_session.liveagentSession.pollTimeout = session.clientPollTimeout;
		current_session.liveagentSession.initialFetchTime = Date.now();
		current_session.liveagentSession.currentFetchTime = Date.now();

		messenger.chasitorInit(
			current_session.liveagentSession.key,
			current_session.liveagentSession.affinityToken,
			current_session.liveagentSession.id,
			current_session.lineSession
		).then(chasitor => {
			console.log("Chasitor %j", chasitor);
			console.log("Chasitor Session %j", session);
			//-1 for init
			current_session.liveagentSession.sequence = -1;
			current_session.liveagentSession.timer = null;

    		function initialPooling(current_session){
    			estabishedLp(current_session);
    		};

    		function estabishedLp(current_session){
    			messenger.messages(current_session.liveagentSession, current_session.sequence).then(newmsg =>{
    				
    				//code 204
    				if(newmsg==''){

    					var diffFromCurrent = (Date.now() - current_session.liveagentSession.currentFetchTime)/1000;

    					var deadlineTime = (current_session.liveagentSession.warningTime)?
    										current_session.liveagentSession.warningTime:
    										current_session.liveagentSession.connectionTimeout;
						console.log('diff v dead',diffFromCurrent,deadlineTime);
    					if(diffFromCurrent > deadlineTime){
    						current_session.lineSession.talkToAgent = false;
	    					current_session.liveagentSession.agentQueue = null;
	    					messenger.line_push_send(client, {type: 'text',
		    								text: `Thank you for conversation. Have a nice day.`}, current_session);
	    					messenger.sendLAEnd(current_session, "timeout");
    					}else{
    						initialPooling(current_session);
    					}

    				}else {

    					current_session.liveagentSession.currentFetchTime = Date.now();
	    				var newmsg_json = JSON.parse(newmsg);
	    				
	    				if(newmsg_json.messages[0].type == 'ChatRequestSuccess'){
							console.log('ChatRequestSuccess');
							//update sequence
							//can check queue here 1 = 0 queue
							current_session.liveagentSession.connectionTimeout = newmsg_json.messages[0].message.connectionTimeout;
	    					current_session.liveagentSession.sequence = newmsg_json.sequence;
	    					initialPooling(current_session);
	    				}
	    				else if(newmsg_json.messages[0].type == 'ChatEstablished'){
							console.log('ChatEstablished');
							let chasitorInfo = newmsg_json.messages[0].message;
							console.log(chasitorInfo);
							current_session.liveagentSession.warningTime = chasitorInfo.chasitorIdleTimeout.warningTime;
							current_session.liveagentSession.timeout = chasitorInfo.chasitorIdleTimeout.timeout;
							messenger.line_push_send(client, {type: 'text',
	    								text: `Hello, This is Agent ${chasitorInfo.name}. How may I help you?`}, current_session);
							initialPooling(current_session);
	    				}
	    				else if(newmsg_json.messages[0].type == 'QueueUpdate'){
							console.log('QueueUpdate');
							// message
							// setTimeout(function() {
								// console.log('timeout',current_session);
								initialPooling(current_session);
							// }, 2000);
	    				}
	    				else if(newmsg_json.messages[0].type == 'ChatMessage' || newmsg_json.messages.length > 1){
							console.log('ChatMessage');
							current_session.liveagentSession.sequence = newmsg_json.sequence;

							var tmpmsg = [];
							// for(var mess in newmsg_json.messages){
							for (var i = 0; i < newmsg_json.messages.length; ++i) {
								if(newmsg_json.messages[i].type == 'ChatMessage'){
									tmpmsg.push({
										type: 'text',
	    								text: newmsg_json.messages[i].message.text
									});
								}
							}
							//newmsg_json.messages[0].message.text
							messenger.line_push_send(client, tmpmsg, current_session);
							initialPooling(current_session);
	    				}
	    				else if(newmsg_json.messages[0].type == 'ChatEnded'){
							console.log('ChatEnded');
							current_session.lineSession.talkToAgent = false;
							current_session.liveagentSession.agentQueue = null;
							messenger.line_push_send(client, {type: 'text',
	    								text: `Thank you for conversation. Have a nice day.`}, current_session);
	    				}
	    				else if(newmsg_json.messages[0].type == 'ChatRequestFail'){
							console.log('ChatRequestFail');
							current_session.lineSession.talkToAgent = false;
							current_session.liveagentSession.agentQueue = null;
							messenger.line_push_send(client, {type: 'text',
	    								text: `No Agent Available.`}, current_session);
	    				}
	    				else if(newmsg_json.messages[0].type == 'AgentTyping'){
							console.log('AgentTyping');
							initialPooling(current_session);
	    				}
	    				else if(newmsg_json.messages[0].type == 'AgentNotTyping'){
							console.log('AgentNotTyping');
							initialPooling(current_session);
	    				}
	    			}
    			}).catch((err)=>{
    				console.log('err',err);
    			});
    		};
    		initialPooling(current_session);
    		// }, 2000);

			// message(globalSession, globalSequence, sender);
		});
	});
};

exports.startAgent = (sender, values) => {
	messenger.send({text : `Hang on a sec.`}, sender);
	messenger.getLiveAgentSession().then(session => {
		console.log("Session %j", session);
		// console.log("Values " + values[1]);
		var key = session.key;
		console.log("key: " + key);

		//check expired
		// if(session.id in globalSession){

		// }
		messenger.chasitorInit(session.key, session.affinityToken, session.id).then(chasitor => {
			console.log("Chasitor %j", chasitor);
			console.log("Chasitor Session %j", session);
			// globalSession[session.id] = {
			// 	session,
			// 	sequence: -1
			// };
			globalSession = session;
			globalSequence = -1;
				
			// message(globalSession, globalSequence, sender);
		});
	});
};

exports.liveAgentMessage = (sender, values) => {
	console.log('LA session: %j', globalSession);
	console.log('LA sequence: ' + globalSequence);
	console.log('Text: ' + values);
	//postbacks.message(globalSession, globalSequence+1,sender);
	messenger.sendLAMessage(globalSession, values[0]);
};