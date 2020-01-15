const path = require('path')

const line = require('@line/bot-sdk');
var express = require('express'),
	cache = require('memory-cache'),
	bodyParser = require('body-parser'),
	processor = require('./modules/processor'),
	handlers = require('./modules/handlers'),
	postbacks = require('./modules/postbacks'),
	global = require('./global'),
	FB_VERIFY_TOKEN = 'apassword1',
	app = express(),
	Queue = require('better-queue');

const config = {
  channelAccessToken: '7lbknA+g/km+TPw6gCAsNHFO2fITWEujBBEIsW1s0yMzaY4m7x2tc8WriesTvXnI5hWzi+gcPFkM+K385ELq26hUILh15aJEGz9AJsxgqBV89hI36x/mlJ42TL4969Bk0MHjeKVD9ZCWykQaYMOE3AdB04t89/1O/w1cDnyilFU=',
  channelSecret: '6b3fece6ae2a2a46630707f2c71b5274',
};

app.use(express.static('public'));
// create LINE SDK client
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('port', process.env.PORT || 8200);

app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});
const client = new line.Client(config);
// event handler
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }
  // console.log(globalSession);
	if(cache.get(event.source.userId) != null){
		//update reply token
		cache.get(event.source.userId).lineSession.replyToken = event.replyToken;
	}else{
		cache.put(event.source.userId, {
			lineSession:{
				talkToAgent: false,
				replyToken: event.replyToken,
				userId: event.source.userId,
			},
			liveagentSession: {
				agentQueue: null
			}
		});
	}

	if(event.message.text == 'talk to agent' && cache.get(event.source.userId).lineSession.talkToAgent==false){
		cache.get(event.source.userId).lineSession.talkToAgent = true;
		cache.get(event.source.userId).liveagentSession.agentQueue = new Queue(function(pme, cb){
					pme.then(()=>{
						cb();
					});
				});
		handlers.lineStartAgent(client, cache.get(event.source.userId));
	}else if(event.message.text == 'done talking'){
		handlers.lineStopAgent(client, cache.get(event.source.userId));
	}else{
		if(cache.get(event.source.userId).lineSession.talkToAgent && cache.get(event.source.userId).liveagentSession.agentQueue!=null){
			handlers.lineTalkToAgent(cache.get(event.source.userId), event.message.text);
		}
	}
}

app.use(bodyParser.json());

app.get('/webhook', (req, res) => {
	console.log(req.query['hub.verify_token']);
	if(req.query['hub.verify_token'] === FB_VERIFY_TOKEN){
		res.send(req.query['hub.challenge']);
	}
	else{
		res.send('Error, wrong validation token');
	}
});

app.post('/webhook', (req, res) => {
	let events = req.body.entry[0].messaging;
	for(let i=0; i<events.length; i++){
		let event = events[i];
		let sender = event.sender.id;
		console.log('sender',sender);
		if(process.env.MAINTENANCE_MODE && ((event.message && event.message.text) || event.postback)){
			sendMessage({text : `MAINTENANCE_MODE`}, sender);
			// res.sendStatus(200);
		}
		else if(event.message && event.message.text){

			if(cache.get(sender) != null){
				//update reply token
				// cache.get(sender).fbSession.replyToken = event.replyToken;
			}else{
				cache.put(sender, {
					fbSession:{
						talkToAgent: false,
						// replyToken: event.replyToken,
						userId: sender,
						agentQueue: null
					},
					liveagentSession: {
						agentQueue: null
					}
				});
			}

			if(event.message.text == 'talk to agent' && cache.get(sender).fbSession.talkToAgent==false){
				cache.get(sender).fbSession.talkToAgent = true;
				cache.get(sender).fbSession.agentQueue = new Queue(function(pme, cb){
							pme.then(()=>{
								cb();
							});
						});
				cache.get(sender).liveagentSession.agentQueue = new Queue(function(pme, cb){
							pme.then(()=>{
								cb();
							});
						});
				handlers.fbStartAgent(cache.get(sender));
			}else if(event.message.text == 'done talking'){
				handlers.fbStopAgent(cache.get(sender));
			}else{
				console.log('cache.get(sender).fbSession.talkToAgent',cache.get(sender).fbSession.talkToAgent);
				if(cache.get(sender).fbSession.talkToAgent && cache.get(sender).liveagentSession.agentQueue!=null){
					handlers.fbTalkToAgent(cache.get(sender), event.message.text);
				}else{
					let result = processor.match(event.message.text);
					if(result){
						let handler = handlers[result.handler];
						if(handler && typeof handler === "function"){
							handler(sender, result.match);
						}
						else{
							console.log("Handler " + result.handlerName + " is not defined.");
						}
					}
				}
			}
		}
		else if(event.postback){
			console.log('postback');
			let payload = event.postback.payload.split(",");
			let postback = postbacks[payload[0]];
			if(postback && typeof postback === 'function'){
				postback(sender, payload);
			}
			else{
				console.log('Postback ' + postback + ' is not defined');
			}
			// res.sendStatus(200);
		}
	}
	res.sendStatus(200);
	
});


app.listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});
