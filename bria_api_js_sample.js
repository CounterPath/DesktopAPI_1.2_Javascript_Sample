/*****************************************************************************
 * JavaScript Sample of Bria Desktop API usage over a WebSocket connection
 *****************************************************************************/
 
/* Using jQuery to facilitate some interactions with the HTML page, this is not a requirement to use the Bria Desktop API */ 
jq = jQuery.noConflict();
 
 
/* A collection of fixed string values used with the Bria Desktop API, arranged in some ENUM-style structures 
   are found in bria_api_constants.js. This is mainly to make the sample code easier to read and to avoid the
   occasional slight typo that can be challenging to troubleshoot. "Raw" values can certainly be used in place
   of these should that be preferred. */   
 
  
/****************************************************************************
                      WEB SOCKET CONNECTION HANDLING
 ****************************************************************************/
 
var apiUri = "wss://cpclientapi.softphone.com:9002/counterpath/socketapi/v1/";
var websocket;
 
function initialize() {
	connectToWebSocket();
}
 
function onConnectedToWebSocket() {
	/* Do some stuff here when the connection is first established ... */
	
	apiGetStatus(ApiStatusEventTypes.properties[ApiStatusEventTypes.AUTHENTICATION].text);

	/* Request CALL status to sync the list of active calls */
	apiGetStatus(ApiStatusEventTypes.properties[ApiStatusEventTypes.CALL].text);
	
	/* Request CALLHISTORY status to sync the content of the Call History item list */
	apiGetStatusWithParameters(ApiStatusEventTypes.properties[ApiStatusEventTypes.CALLHISTORY].text, ' <count>15</count>\r\n <entryType>all</entryType>\r\n');	
	
	/* Request SCREENSHARE status to sync the status in the Screen-Sharing box */
	apiGetStatus(ApiStatusEventTypes.properties[ApiStatusEventTypes.SCREENSHARE].text);
}	
 
/* 'connectToWebSocket' contain construction or the WebSocket object, connection, error - and event handling */
/* On any disconnection the error handling will attempt to reconnect after 5 seconds */ 
function connectToWebSocket() {
	var connectionError = false;
	var incomingMessage;
	
	/* Create new WebSocket object */
	try {
		websocket = new WebSocket(apiUri);
	}
	catch(e) {
		console.log('WebSocket exception: ' + e);
	}	

	/* Event handler for connection established */
	websocket.onopen = function(evt) {
		connectionError = false;
		setConnectionStatus('CONNECTED');
		onConnectedToWebSocket();
	};
	
	/* Event handler for disconnection from Web-Socket */
	websocket.onclose = function(evt) {
		if (!connectionError) {
			setConnectionStatus('DISCONNECTED - retrying connection after 5 seconds ...');
		}
		console.log('OnClose: ' + evt.code);
		
		/* Set timer to attempt re-connection in 5 seconds */
		setTimeout(function() { connectToWebSocket(); }, 5000);
	};

	/* Event handler for Errors on the Web-Socket connection */
	websocket.onerror = function(evt) {
		connectionError = true;
		setConnectionStatus('ERROR Could not connect to WebSocket - retry will happen after 5 seconds ...');
		console.log('OnError: ' + evt.name);
		websocket.close();
	};
	
	/* Event handler for received messages via web-socket connection */	
	websocket.onmessage = function(evt) {
		appendToLog('--- RECEIVED ---\n' + evt.data);
		
		processApiMessageReceived(evt.data);
	};
}
	 
function sendMessage(msg) {
	websocket.send(msg);
	appendToLog('----- SENT -----\n' + msg);
}	


/****************************************************************************
                         HTML ON-CLICK HANDLERS
 ****************************************************************************/  

function placeCall() {
    var target = jq('#CallTargetTextInput').val();
	var suppressGUI = jq('#SuppressMainWindowCheckbox').is(':checked');
	
	apiPlaceCall(target, suppressGUI);
}

function bringToFront() {
	apiBringToFront();
}

function sendIM() {
	var target = jq('#IMAddressTextInput').val();
	var typeSelect = jq('input[name=IMAddressType]:checked').val();
	
	var type;
	if (typeSelect == 'SIP') type='sip'; else type='xmpp';
	
	apiSendIM(target, type);
}

function startScreenSharing() {
	var targets = jq('#ScreenShareAddressTextInput').val();
	var typeSelect = jq('input[name=ScreenShareAddressType]:checked').val();
	
	var type;
	if (typeSelect == 'SIP') type='simple'; else type='xmpp';
	
	apiStartScreenShare(targets, type);
}

function login() {
	var username = jq('#UsernameTextInput').val();
	var password = jq('#PasswordTextInput').val();

	apiSignIn(username, password);
}

function logout() {
	apiSignOut();
}

function exit() {
	apiExit();
}
	
/****************************************************************************
                          API MESSAGE CONSTRUCTION
 ****************************************************************************/	 

const userAgentString = "Bria API JavaScript Sample";
  
var lastTransactionID = 0;	
	
function getNextTransactionID() {
	lastTransactionID++;
	return lastTransactionID;
}
	
function constructApiMessage(requestType, body) {
    var contentLength = body.length;
	var msg = 'GET /' + ApiRequestTypes.properties[requestType].text 
			+ '\r\nUser-Agent: ' + userAgentString 
			+ '\r\nTransaction-ID: ' + getNextTransactionID() 
			+ '\r\nContent-Type: application/xml\r\nContent-Length: ' + contentLength;

	if (contentLength > 0) msg += '\r\n\r\n' + body;

    return msg;
}
	
	
/****************************************************************************
                             BRIA API COMMANDS
 ****************************************************************************/	

function apiBringToFront() {	
	var msg = constructApiMessage(ApiRequestTypes.BRINGTOFRONT, '');
	sendMessage(msg);
} 
 
function apiPlaceCall(target, suppressGUI) {
	var content = xmlDeclarationString + '<dial type="audio">\r\n <number>' + target + '</number>\r\n <displayName></displayName>\r\n <suppressMainWindow>' + suppressGUI + '</suppressMainWindow>\r\n</dial>';
	var msg = constructApiMessage(ApiRequestTypes.CALL, content);
	sendMessage(msg);
}	

function apiAnswerCall(callId, withVideo) {
	var content = xmlDeclarationString + '<answerCall>\r\n <callId>' + callId + '</callId>\r\n <withVideo>' + withVideo + '</withVideo>\r\n</answerCall>';
	var msg = constructApiMessage(ApiRequestTypes.ANSWER, content);
	sendMessage(msg);
}

function apiEndCall(callId) {
	var content = xmlDeclarationString + '<endCall>\r\n <callId>' + callId + '</callId>\r\n</endCall>';
	var msg = constructApiMessage(ApiRequestTypes.ENDCALL, content);
	sendMessage(msg);
}

function apiHoldCall(callId) {
	var content = xmlDeclarationString + '<holdCall>\r\n <callId>' + callId + '</callId>\r\n</holdCall>';
	var msg = constructApiMessage(ApiRequestTypes.HOLD, content);
	sendMessage(msg);
}

function apiResumeCall(callId) {
	var content = xmlDeclarationString + '<resumeCall>\r\n <callId>' + callId + '</callId>\r\n</resumeCall>';
	var msg = constructApiMessage(ApiRequestTypes.RESUME, content);
	sendMessage(msg);
}

function apiTransferCall(callId, target) {
	var content = xmlDeclarationString + '<transferCall>\r\n <callId>' + callId + '</callId>\r\n <target>' + target + '</target>\r\n</transferCall>';
	var msg = constructApiMessage(ApiRequestTypes.TRANSFERCALL, content);
	sendMessage(msg);
}

function apiSendIM(target, type) {
	var content = xmlDeclarationString + '<im type=\"' + type + '\">\r\n <address>' + target + '</address>\r\n</im>';
	var msg = constructApiMessage(ApiRequestTypes.IM, content);
	sendMessage(msg);	
}

/* targetList is a semi-colon separated list of target SIP URI or XMPP JID addresses - this function only handle all addresses being the same type*/
function apiStartScreenShare(targetList, type) {
	var targets = targetList.split(';');
	
	var content = xmlDeclarationString + '<invitees>\r\n';
	for (var i=0; i < targets.length; i++) {
		content += ' <invitee>\r\n  <address type=\"' + type + '\">' + targets[i].trim() + '</address>\r\n </invitee>\r\n';
	}
	content += '</invitees>';
	var msg = constructApiMessage(ApiRequestTypes.STARTSCREENSHARE, content);
	sendMessage(msg);	
}

function apiGetStatus(statusType) {
	var content = xmlDeclarationString + '<status>\r\n <type>' + statusType + '</type>\r\n</status>';
	var msg = constructApiMessage(ApiRequestTypes.STATUS, content);
	sendMessage(msg);
}

function apiGetStatusWithParameters(statusType, parameterXML) {
	var content = xmlDeclarationString + '<status>\r\n <type>' + statusType + '</type>\r\n' + parameterXML + '</status>';
	var msg = constructApiMessage(ApiRequestTypes.STATUS, content);
	sendMessage(msg);	
}

function apiSignIn(username, password) {
	var content = xmlDeclarationString + '<signIn>\r\n <user>' + username + '</user>\r\n <password>' + password + '</password>\r\n</signIn>';
	var msg = constructApiMessage(ApiRequestTypes.SIGNIN, content);
	sendMessage(msg);
}

function apiSignOut() {
	var msg = constructApiMessage(ApiRequestTypes.SIGNOUT, '');
	sendMessage(msg);
} 

function apiExit() {
	var msg = constructApiMessage(ApiRequestTypes.EXIT, '');
	sendMessage(msg);
} 



/****************************************************************************
                          BRIA API EVENT HANDLING
 ****************************************************************************/

/* 'getStringValueFromXMLTag' is a helper function for digging through XML *
 * structures to retrieve values from the first occurrence of a named tag  */ 
function getStringValueFromXMLTag(xmlItem, tagName) {

	/* Get the first XML element with the given tag name */
	var element = xmlItem.getElementsByTagName(tagName)[0];
	
	if (element != null) {
		/* Get the first child node from the element */
		var childNode = element.childNodes[0];
	
		/* If the child node exist, return the value for it */
		if (childNode != null) return childNode.nodeValue;
	}
	
	/* If tag isn't found or has no value, return a blank string */
	return "";
}

 
function handleStatusChangeEvent(eventType) {
	console.log('Status Change Event - type: ' + eventType);

	/* Process events that we care about, ignore the rest */
	
	switch (eventType) {
		case ApiStatusEventTypes.properties[ApiStatusEventTypes.AUTHENTICATION].text:
		case ApiStatusEventTypes.properties[ApiStatusEventTypes.CALL].text:
		case ApiStatusEventTypes.properties[ApiStatusEventTypes.SCREENSHARE].text:
			/* Received a simple status event - request details with Get Status without parameters */
			apiGetStatus(eventType);
			break;
		case ApiStatusEventTypes.properties[ApiStatusEventTypes.CALLHISTORY].text:
			/* Status events like CallHistory require a Get Status with parameters */
			apiGetStatusWithParameters(eventType, ' <count>15</count>\r\n <entryType>all</entryType>\r\n');
			break;
	}
}	
 
function handleCallStatusResponse(callStatusDoc) {
	/* Each Call Status Response contain zero or more 'call' elements with information about each ongoing call */
	var calls = callStatusDoc.getElementsByTagName("call");
	
	/* Create an array to hold the list of calls */
	var currentCallList = [];
	
	/* Iterate through the list of calls and pick out the information */
	for (var i = 0; i < calls.length; i++) {
		var call = calls[i];
		
		var id = getStringValueFromXMLTag(call, 'id');
		var hold = getStringValueFromXMLTag(call, 'holdStatus');
		var recordingStatus = getStringValueFromXMLTag(call, 'recordingStatus');
		var recordingFile = getStringValueFromXMLTag(call, 'recordingFile'); 

		/* Each call has a list of one or more remote participants */
		var participants = call.getElementsByTagName('participants')[0].getElementsByTagName('participant');
		
		/* Create an array to hold the list of participants in each call */
		var participantList = [];
		
		/* Iterate through the list of remote participants and pick out the information */
		for (var p = 0; p < participants.length; p++) {
			var participant = participants[p];
			
			var number = getStringValueFromXMLTag(participant, 'number');
			var displayName = getStringValueFromXMLTag(participant, 'displayName');
			var state = getStringValueFromXMLTag(participant, 'state');
			var startTime = getStringValueFromXMLTag(participant, 'timeInitiated');
			var participantInfo = {
				number : number,
				displayName : displayName,
				state : state,
				startTime : startTime
			};
			
			/* Add this participant to the list */
			participantList.push(participantInfo);
		}
		
		/* Create an object to store the information for this call */
		var callInfo = {
			id : id,
			hold : hold,
			recording : recordingStatus,
			file : recordingFile,
			participants : participantList
		};
	
		/* Add this call to the list */
		currentCallList.push(callInfo);
	}
	
	/* Call Helper Function to update HTML with current Call Information */
	updateCallActivity(currentCallList);
}	

function handleCallHistoryStatusResponse(callHistoryStatusDoc) {
	/* Each CallHistory Status Response contain zero or more 'callHistory' elements */
	var items = callHistoryStatusDoc.getElementsByTagName("callHistory");
	
	/* Create a string variable to hold the HTML content we will construct with the history information */
	var html = '';
	
	/* Iterate throgh each CallHistory item and pick out information */
	for (var i = 0; i < items.length; i++) {
		var item = items[i];
		
		var timeStamp = getStringValueFromXMLTag(item, 'timeInitiated');
		var displayName = getStringValueFromXMLTag(item, 'displayName');
		var number = getStringValueFromXMLTag(item, 'number');
		
		/* Add each line to the resulting HTML */		
		html += formatDateTime(timeStamp) + ' : [ ' + displayName + ' ] ( <a href="" onclick="apiPlaceCall(\'' + number + '\', true); return false;">' + number + '</a> )<br/>'; 
	}

	/* Using JQuery to set HTML content in the div called CallHistory */
	jq('#CallHistoryDiv').html(html);	
}	

function handleScreenShareStatusResponse(screenShareStatusDoc) {
	var item = screenShareStatusDoc.getElementsByTagName("session")[0];
	var html = 'Screensharing is not active';
	
	var startButtonDisabled = false;
	
	
	if (item != null)
	{
		var status = getStringValueFromXMLTag(item, 'status');
		var joinUrl = getStringValueFromXMLTag(item, 'joinUrl');
		
		html = 'Screen-Sharing is ' + status;
		
		if ((status == 'active') || (status == 'connecting')) {
			startButtonDisabled = true;
			html += '<br/>Join URL: ' + joinUrl;
		} 
	}
	
	jq('#StartScreenShareButton').prop("disabled", startButtonDisabled);
	jq('#ScreenshareStatusDiv').html(html);
}
 
function handleAuthenticationStatusResponse(authenticationStatusDoc) {

	var authenticated = getStringValueFromXMLTag(authenticationStatusDoc, 'authenticated');
	console.log('Logged in: ' + authenticated);
	
	if (authenticated == 'true') {
		/* Client is logged in */
		updateLoginSection(true);

	} else {
		/* Client is logged out */
		var failedReason = getStringValueFromXMLTag(authenticationStatusDoc, 'notAuthenticatedReason');
		var serverReason = getStringValueFromXMLTag(authenticationStatusDoc, 'serverProvidedReason');

		console.log('Client logged out due to: ' + failedReason);
		console.log('Server provided reason: ' + serverReason);

		updateLoginSection(false);
	}
}

/****************************************************************************
                          BRIA API MESSAGE HANDLING
 ****************************************************************************/
 
function processApiMessageReceived(msg) {
	incomingMessage = parseMessage(msg);
	
	switch (incomingMessage.messageType) {
		case ApiMessageTypes.RESPONSE:	
			/* This is a response to a status query */
			processResponse(incomingMessage.content);
			break;
			
		case ApiMessageTypes.EVENT:
			/* Check the event type */
			if (incomingMessage.eventType == ApiEventTypes.STATUSCHANGE) {
				/* Handle the Status Change Event */
				processStatusChangeEvent(incomingMessage.content);
			} else {
				/* Unknown event type received */
				console.log('Unknown Event Type received ' + incomingMessage.eventType );
			};
			break;
			
		case ApiMessageTypes.ERROR:
			/* Handle Error from API */
			console.log('API Returned Error: ' + incomingMessage.errorCode + ' - ' + incomingMessage.errorText);
			break;
			
		default:
			/* Unknown message type received */
			console.log('Unknown API Message Type received');
			break;
	}
}	

function processResponse(responseXML) {
	/* Basic responses carry no content, so we don't need to process them */
	/* For responses with XML data, figure out the type and distribute to sub-processing functions */
	if (responseXML.length > 0) {
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(responseXML, "text/xml");
	
		var statusElement = xmlDoc.getElementsByTagName("status")[0];
		if (statusElement != null) {
			var statusType = statusElement.getAttributeNode("type");
			console.log('Status Response type: ' + statusType.nodeValue);
			
			switch (statusType.nodeValue) {
				case ApiStatusEventTypes.properties[ApiStatusEventTypes.CALL].text:
					handleCallStatusResponse(xmlDoc);
					break;
				case ApiStatusEventTypes.properties[ApiStatusEventTypes.CALLHISTORY].text:
					handleCallHistoryStatusResponse(xmlDoc);
					break;
				case ApiStatusEventTypes.properties[ApiStatusEventTypes.SCREENSHARE].text:
					handleScreenShareStatusResponse	(xmlDoc);
					break;
				case ApiStatusEventTypes.properties[ApiStatusEventTypes.AUTHENTICATION].text:
					handleAuthenticationStatusResponse(xmlDoc);
					break;

				default:
					console.log('Unknown Response type: ' + responseXML);
					break;
			}
		}
	}
}
 
function processStatusChangeEvent(eventXML) {
	var parser = new DOMParser();
	var xmlDoc = parser.parseFromString(eventXML, "text/xml");
	
	var eventElement = xmlDoc.getElementsByTagName("event")[0];
	var eventType = eventElement.getAttributeNode("type");
	
	handleStatusChangeEvent(eventType.nodeValue);
}	
 
/****************************************************************************
                          BRIA API MESSAGE PARSING
 ****************************************************************************/
 
function parseMessage(msg) {
	var messageType = ApiMessageTypes.UNKNOWN;
	var eventType = ApiEventTypes.UNKNOWN;
	var errorCode = 0;
	var errorText = "";
	
	var transactionId = "";
	var userAgentString = "";
	var contentType = "";
	var contentLength = 0;
	var content = "";
	
	/* Replace any Windows-Style line-endings with \n */
	var lines = msg.replace( /\r\n/g, "\n").split("\n");
	var line = lines[0];
	
	/* Parse the first line to determine the type of message */
	if (line.substr(0,4) == 'POST') {
		messageType = ApiMessageTypes.EVENT;
		line = line.substr(5).trim();
		if (line.substr(0,13) == '/statusChange')
		{
			eventType = ApiEventTypes.STATUSCHANGE;
		}
	} else if (line.substr(0,8) == 'HTTP/1.1') {
		line = line.substr(8).trim();
		if (line.substr(0,6) == '200 OK') {
			messageType = ApiMessageTypes.RESPONSE;
		} else if ((line[0] == '4') || (line[0] == '5')) {
			messageType = ApiMessageTypes.ERROR;
			errorCode = line.substr(0,3);
			errorText = line.substr(4);
		}
	}

	/* Parse the remaining lines in the header and extract values */
	var i = 1;
	for (; i<lines.length; i++) {
		line = lines[i];
		
		if (line[0] == '<') {
			/* Start of the content section */
			break;
		} else if (line.substr(0,15) == 'Transaction-ID:')	{
			transactionId = line.substr(15).trim();
		} else if (line.substr(0,11) == 'User-Agent:') {
			userAgentString = line.substr(11).trim();
		} else if (line.substr(0,13) == 'Content-Type:') {
			contentType = line.substr(13).trim();
		} else if (line.substr(0,15) == 'Content-Length:') {
			contentLength = Number(line.substr(15).trim());
		} else {
			/* Ignore any unknown headers */
			continue;
		}
	}

	/* Re-assemble the content portion from the remaining lines */
	for (; i<lines.length; i++) {
		content += lines[i];
		if (i < lines.length-1) {
			content += '\n';
		}
	}
	
	/* Return object with all the details from the message */
	return {
		messageType: messageType,
		eventType: eventType,
		errorCode: errorCode,
		errorText: errorText,
		transactionId: transactionId,
		userAgentString: userAgentString,
		contentType: contentType,
		contentLength: contentLength,
		content: content
	};
}
 

/****************************************************************************
                         HTML/UI HELPER FUNCTIONS
 ****************************************************************************/
 
function setConnectionStatus(status) {
	var statusField = jq('#ConnectionStatusText');
	statusField.text(status);
	console.log('setting status to: ' + status);
}
 
function appendToLog(data) {
	var logField = jq('#APIMessageLog');
	logField.val(logField.val() + data + '\n\n');
	logField.scrollTop(logField[0].scrollHeight);
}	

function clearLog() {
	var logField = jq('#APIMessageLog');
	logField.val("");
}

function formatDateTime(t) {
	/* Input expected to be a UTC Unix timestamp */		
	var tzoffset = (new Date()).getTimezoneOffset() * 60;
	var dateTime = new Date((t - tzoffset) * 1000).toISOString().slice(0, -5);
	
	return dateTime.replace('T', ' ');
}

function doCallTransfer(callid) {
	var target = prompt('Transfer to:', '');
	if (target != null) {
		apiTransferCall(callid, target);
	}
}

function updateCallActivity(callList) {
	var html = '';
	
	for (var i = 0; i < callList.length; i++) {
		var call = callList[i];
		
		if (call.participants.length == 1) {
			/* Plain 1:1 call - straightforward handling */
			participant = call.participants[0];
		
			var holdStateString = '';
			var holdStateAction = '';
		
			if (call.hold == 'localHold') {
				holdStateString = ' [ON HOLD]';
				holdStateAction = ' [<a href="" onclick="apiResumeCall(\'' + call.id + '\'); return false;">Resume</a>]';
			}
			else {
				if (call.hold == 'remoteHold') {
					holdStateString = ' [HELD REMOTE]';
				}
				holdStateAction = ' [<a href="" onclick="apiHoldCall(\'' + call.id + '\'); return false;">Hold</a>]';
			}
				
			switch (participant.state) {
				case ApiCallStates.properties[ApiCallStates.RINGING].text:
					html += 'Incoming call from ' + participant.displayName + holdStateString + ' (' + participant.number + ') <br/>[<a href="" onclick="apiAnswerCall(\'' + call.id + '\', false); return false;">Answer</a>]' + holdStateAction; 
					break;
				case ApiCallStates.properties[ApiCallStates.CONNECTING].text:
					html += 'Outgoing call to ' + participant.displayName + holdStateString + ' (' + participant.number + ') <br/>[<a href="" onclick="apiEndCall(\'' + call.id + '\'); return false;">End Call</a>]' + holdStateAction; 
					break;
				case ApiCallStates.properties[ApiCallStates.CONNECTED].text:
					html += 'Connected call with ' + participant.displayName + holdStateString + ' (' + participant.number + ') <br/>[<a href="" onclick="apiEndCall(\'' + call.id + '\'); return false;">End Call</a>]' + holdStateAction + ' [<a href="" onclick="doCallTransfer(\'' + call.id + '\'); return false;">Transfer</a>]';
					break;
				default:
					html += 'Call ' + participant.state + ' ';
					break;
			}
			
			
			html += '<br/><br/>';
		}
		else
		{
			/* Call with multiple participants - display as conference */
			
		}
			
	}
	
	jq('#CallActivityDiv').html(html);
}

function updateLoginSection(loggedIn) {
	jq('#LoginButton').prop("disabled", loggedIn);
	jq('#LogoutButton').prop("disabled", !(loggedIn));
}


/****************************************************************************
    EVERYTHING STARTS BY CALLING INITIALIZE WHEN THE PAGE IS DONE LOADING
 ****************************************************************************/

window.addEventListener("load", initialize, false);
 