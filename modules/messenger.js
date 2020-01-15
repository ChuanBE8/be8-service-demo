"use strict";

let request = require('request'),
	FB_PAGE_TOKEN = 'EAAIlSdWiEYgBAOttE5hPmnlHeU5bRP2OrZAEeeic4KMXRCEVD5X2xOBhnyJ59cM581JxWLKczGCiRS99aZC72kFLtXfKoAK9xjXBRJPnhc8bvbZBk5uOy44pQ4PRRfcoy8pmp3tv9qPRoYUymQMJ5C339jbgr4HUs8r4VmrDRPUlWCbovCm',
	ORG_ID = '00D2K000000oxYp',
	LIVE_AGENT_DEPLOYMENT = '5721s000000003J',
	LIVE_AGENT_BUTTON = '5731s00000000A5',
	LIVE_AGENT_LANGUAGE = 'en-US',
	SCREEN_RES = '1900x1080',
	VISITOR_NAME = 'FB ppl',
	CASE_RECORD_TYPE = '';

exports.botSend = (message, recipient) => {
	
	request({
		url : 'https://graph.facebook.com/v3.3/me/messages',
		qs : {access_token: FB_PAGE_TOKEN},
		method : 'POST',
		json : {
			recipient : {id : recipient},
			message : message
		}
	}, (error, response) => {
		if(error){
			console.log('Error sending message: ', error);
		}
		else if(response.body.error){
			console.log('Error: ', response.body.error);
		}
	});

};
exports.send = (message, current_session) => {
	
	if(!Array.isArray(message)){
		console.log('msg',message);
		current_session.fbSession.agentQueue.push(
			new Promise((resolve, reject) => {
				request({
					url : 'https://graph.facebook.com/v3.3/me/messages',
					qs : {access_token: FB_PAGE_TOKEN},
					method : 'POST',
					json : {
						recipient : {id : current_session.fbSession.userId},
						message : message
					}
				}, (error, response) => {
					if(error){
						console.log('Error sending message: ', error);
					}
					else if(response.body.error){
						console.log('Error: ', response.body.error);
					}
					resolve(response.body);
				});
			})
		);
	}else{
		for (var i = 0; i < message.length ; i++) {
			console.log('msg',message[i]);
			current_session.fbSession.agentQueue.push(
				new Promise((resolve, reject) => {
					request({
						url : 'https://graph.facebook.com/v3.3/me/messages',
						qs : {access_token: FB_PAGE_TOKEN},
						method : 'POST',
						json : {
							recipient : {id : current_session.fbSession.userId},
							message : message[i]
						}
					}, (error, response) => {
						if(error){
							console.log('Error sending message: ', error);
						}
						else if(response.body.error){
							console.log('Error: ', response.body.error);
						}
						resolve(response.body);
					});
				})
			);
		}
	}
};
exports.line_send = (client, msg, current_session) => {
	client.replyMessage(current_session.lineSession.replyToken, {
		type: 'text',
    	text: msg
  	});
};
exports.line_push_send = (client, msg, current_session) => {
	client.pushMessage(current_session.lineSession.userId, msg);
};

exports.getLineUserInfo = (client, userId) => {
	return new Promise((resolve, reject) => {
		client.getProfile(userId).then((res)=>{
			resolve(res);
		}).catch((err)=>{
			reject(err);
		})
	});
	
}
exports.getUserInfo = (userId) => {
	return new Promise((resolve, reject) => {
		request({
			url : `https://graph.facebook.com/v3.3/${userId}`,
			qs : {fields:"first_name,last_name,profile_pic", access_token: FB_PAGE_TOKEN},
			method : 'GET'
		}, (error, response) => {
			if (error) {
                console.log('Error sending message: ', error);
                reject(error);
            } else if (response.body.error) {
                console.log('Error: ', response.body.error);
            } else {
                resolve(JSON.parse(response.body));
            }
		});
	});
};

exports.getLiveAgentSession = () => {
	return new Promise((resolve, reject) => {
		request({
			url : 'https://krungsri--devCC.cs113.salesforceliveagent.com/chat/rest/System/SessionId',
			method : 'GET',
			headers : {
				"Content-Type":"application/json",
				"X-LIVEAGENT-API-VERSION" : 46,
				"X-LIVEAGENT-AFFINITY" : null
			}
		}, (error, response) => {
			if(error){
				console.log('Error getting session id: ', error);
			}
			else if(response.body.error){
				console.log('Error: ', response.body.error);
			}
			else{
				// console.log('responseresponse',response);
				// console.log('Response: %j', response.body);
				resolve(JSON.parse(response.body));
			}
		});
	});
};

exports.chasitorInit = (key, token, id, visitorLine) => {
	console.log('Chasitor Key' + key);
	console.log('Chasitor Token ' + token);
	console.log('Chasitor Id' + id);
	
	return new Promise((resolve, reject) => {
		request({
			url : 'https://krungsri--devCC.cs113.salesforceliveagent.com/chat/rest/Chasitor/ChasitorInit',
			method : 'POST',
			headers : {
				"X-LIVEAGENT-API-VERSION" : 46,
				"X-LIVEAGENT-AFFINITY" : token,
				"X-LIVEAGENT-SESSION-KEY" : key,
				"X-LIVEAGENT-SEQUENCE" : 1
			},
			json : {
				"organizationId" : ORG_ID,
				"deploymentId" : LIVE_AGENT_DEPLOYMENT,
				"buttonId" : LIVE_AGENT_BUTTON,
				"sessionId" : id,
				"userAgent" : "",
				"language" : LIVE_AGENT_LANGUAGE,
				"screenResolution" : SCREEN_RES,
				"visitorName" : visitorLine.displayName,
				"prechatDetails": [
				{
			         "label":"Name",
			         "value": visitorLine.displayName,
			         "entityMaps":[
			            {
			               "entityName":"Account",
			               "fieldName":"Name"
			            },
			            {
			               "entityName":"Account",
			               "fieldName":"Display_Line_Name__c"
			            }
			         ],
			         "transcriptFields":[
			            "Line_Display_Name__c"
			         ],
			         "displayToAgent":true
			      },
			      {
			         "label":"Display Line Id",
			         "value": visitorLine.userId,
			         "entityMaps":[
			            {
			               "entityName":"Account",
			               "fieldName":"Line_Id__c"
			            }
			         ],
			         "transcriptFields":[
			            "Line_User_Id__c"
			         ],
			         "displayToAgent":true
			      }
				],
				"prechatEntities": [
				{
			        "entityName":"Account",         
			         "saveToTranscript":"accountId",
			         // "linkToEntityName":"Case",
			         // "linkToEntityField":"AccountId",
			         "entityFieldsMaps":[
			         	{
			               "fieldName":"Name",
			               "label":"Name",
			               "doFind":true,
			               "isExactMatch":true,
			               "doCreate":true
			            },
			            {
			               "fieldName":"Line_Id__c",
			               "label":"Line Id",
			               "doFind":true,
			               "isExactMatch":true,
			               "doCreate":true
			            },
			            {
			               "fieldName":"Display_Line_Name__c",
			               "label":"Display Line Name",
			               "doFind":false,
			               "isExactMatch":false,
			               "doCreate":true
			            },
			         ]
			     },
				],
				"buttonOverrides" : [],
				"receiveQueueUpdates" : true,
				"isPost" : true
			}
		}, (error, response) => {
			if(error){
				console.log('Error initializing chat: ', error);
			}
			else if(response.body.error){
				console.log('Error: ', response.body.error);
			}
			else{
				// console.log('Response: %j', response.body);
				resolve(response.body);
			}
		});
	});
};

exports.messages = (session, seq) => {
	return new Promise((resolve, reject) => {
		request({
			url : "https://krungsri--devCC.cs113.salesforceliveagent.com/chat/rest/System/Messages",
			method : 'GET',
			qs : {"ack" : seq},
			headers : {
				"X-LIVEAGENT-API-VERSION" : 46,
				"X-LIVEAGENT-AFFINITY" : session.affinityToken,
				"X-LIVEAGENT-SESSION-KEY" : session.key
			}
		}, (error, response) => {
			if(error){
				console.log('Error getting messages: ', error);
			}
			else if(response.body.error){
				console.log('Error: ', response.body.error);
			}
			else{
				// console.log('Response: %j', response);
				//console.log('Response Status', response.status);
				resolve(response.body);
			}
		});
	});
};
exports.sendLAEnd = (current_session, endCause) => {
	console.log('end',endCause);
	// current_session.liveagentSession.agentQueue.push(//return 
		// return new Promise((resolve, reject) => {
			// session.agentQueue(function(){

				// request({
				// 	url : "https://krungsri--devCC.cs113.salesforceliveagent.com/chat/rest/Chasitor/ChatEnd",
				// 	method : 'POST',
				// 	headers : {
				// 		"X-LIVEAGENT-API-VERSION" : 46,
				// 		"X-LIVEAGENT-AFFINITY" : current_session.liveagentSession.affinityToken,
				// 		"X-LIVEAGENT-SESSION-KEY" : current_session.liveagentSession.key,
				// 		// "X-LIVEAGENT-SEQUENCE" : current_session.liveagentSession.sequence
				// 	},
				// 	json : {
				// 		"ChatEndReason" : { reason: "client" },
				// 		"reason": { reason: "client" }
				// 	}
				// }, (error, response) => {
				// 	if(error){
				// 		console.log('Error posting message: ', error);
				// 	}
				// 	else if(response.body.error){
				// 		console.log('Error: ', response.body.error);
				// 	}
				// 	else{
				// 		console.log('Response: %j', response.body);
				// 		current_session.lineSession.talkToAgent = false;
				// 		current_session.fbSession.talkToAgent = false;

				// 		resolve(response.body);
				// 	}
				// });
			// });
		// });
	// );
};
exports.sendLAMessage = (current_session, message) => {
	console.log("Message : " + message);
	current_session.liveagentSession.agentQueue.push(//return 
		new Promise((resolve, reject) => {
			// session.liveagentSession.agentQueue(function(){

				request({
					url : "https://krungsri--devCC.cs113.salesforceliveagent.com/chat/rest/Chasitor/ChatMessage",
					method : 'POST',
					headers : {
						"X-LIVEAGENT-API-VERSION" : 46,
						"X-LIVEAGENT-AFFINITY" : current_session.liveagentSession.affinityToken,
						"X-LIVEAGENT-SESSION-KEY" : current_session.liveagentSession.key
					},
					json : {
						"text" : message
					}
				}, (error, response) => {
					if(error){
						console.log('Error posting message: ', error);
					}
					else if(response.body.error){
						console.log('Error: ', response.body.error);
					}
					else{
						// console.log('Response: %j', response.body);
						current_session.liveagentSession.sequence = current_session.sequence+1;

						resolve(response.body);
					}
				});
			// });
		})
	);
};