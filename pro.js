
var chalk = require( "chalk" );
var fs = require('fs');
var request = require('request');
const events = require('events');
var mime = require('mime');
var util = require('util');

function resumableUpload() {
	this.byteCount = 0; //init variables
	this.tokens = {};
    this.filepath = '';
    this.leech = {};
    /**{ length: '984231520',
        url: 'https://oqbkic.olo..' } */
	this.metadata = {};
	this.query = '';
	this.retry = -1;
	this.host = 'www.googleapis.com';
    this.api = '/upload/drive/v3/files';
    events.EventEmitter.call(this);
};

util.inherits(resumableUpload, events.EventEmitter);

const debug = true;
//Init the upload by POSTing google for an upload URL (saved to self.location)
resumableUpload.prototype.upload = function () {
    var self = this;
    if((!self.filepath) && (!self.leech.url)) {
        self.emit('error', new Error('Tham so loi url'));
        return;
	}
	if((!self.filepath) && (!self.leech.length)) {
        self.emit('error', new Error('Tham so loi length'));
        return;
	}
	// truong hop co san resume upload id
	/*if(self.location){
		//
	}*/
    var lenMe = (self.filepath)? fs.statSync(self.filepath).size : self.leech.length;
    var mimeMe = (self.filepath)? mime.getType(self.filepath) : 'application/octet-stream'; // noi chung la video
	var options = {
		url: 'https://' + self.host + self.api + '?uploadType=resumable' + self.query,
		headers: {
			'Host': self.host,
			'Authorization': 'Bearer ' + self.tokens.access_token,
			'Content-Length': new Buffer(JSON.stringify(self.metadata)).length,
			'Content-Type': 'application/json; charset=UTF-8',
			'X-Upload-Content-Length': lenMe,
			'X-Upload-Content-Type': mimeMe
		},
		body: JSON.stringify(self.metadata)
	};
	// console.log(options);
	//Send request and start upload if success
	request.post(options, function (err, res, body) {
		if (err) {
			self.emit('warn', new Error(err)); // error network
			if ((self.retry > 0) || (self.retry <= -1)) {
				self.retry--;
				self.upload(); // retry
			} else {
				self.emit('error', new Error('Max upload retry, reason: network1'));
				return;
			}
		} else if(!res.headers.location) {
			self.emit('warn', new Error('Error gApi access token1'));
			require('./token').get(function(err, data){
				if(err) return self.emit('error', err);
				if(debug) console.log('new token1:', data);
				self.tokens = data;
				self.upload(); // retry
			});
		} else {
			self.location = res.headers.location;
			self.send();
		}
	});
}

//Pipes uploadPipe to self.location (Google's Location header)
resumableUpload.prototype.send = function () {
	if(debug) console.log('send call this');
    var self = this;
    var lenMe = (self.filepath)? fs.statSync(self.filepath).size : self.leech.length;
	var mimeMe = (self.filepath)? mime.getType(self.filepath) : 'application/octet-stream'; // noi chung la video
	try {
		//creates file stream, pipes it to self.location
        var uploadPipe;
        if(self.filepath) uploadPipe= fs.createReadStream(self.filepath, {
			start: self.byteCount,
			end: lenMe
        });
        else {
			uploadPipe = request.get({
				url: self.leech.url,
				headers: {
					range: `bytes=${self.byteCount}-${lenMe}`
				}
			});
        }
	} catch (e) {
		self.emit('error', new Error(e));
		return;
	}
	uploadPipe.on('error', function(err){
		if(typeof(poolPut)!= 'undefined') clearInterval(poolPut);
		uploadPipe.abort();
		self.emit('warn', err);
		self.send();
	})
	/** Leech stream from openload or rapid server */
	var data = {
		buffer: [],
		len: 0,
		sumdebug: 0
	};
	const NON = 256 * 1024;
	uploadPipe.on('data', function(buffer){
		data.buffer.push(buffer);
		data.len+= buffer.length;
	});
	var poolPut = setInterval(function(){
		if(data.len==0) {
			clearInterval(poolPut);
			uploadPipe.abort();
			return self.emit('success', body);
		}
		var lenUp, xUp = parseInt(data.len  /NON);
		if(xUp>0) {
			lenUp= parseInt(data.len  /NON) * NON;
		} else lenUp = data.len;
		data.len-= lenUp;
		data.buffer = Buffer.concat(data.buffer);
		var dataUp = data.buffer.slice(0, lenUp);
		data.buffer = [data.buffer.slice(lenUp, data.buffer.length)];

		data.sumdebug+= lenUp;

		if(debug && data.sumdebug> (1024*1024*100)) {
			console.log('up len:', (data.sumdebug /1024) /1024, 'MB');
			data.sumdebug = 0;
		}

		var options = {
			url: self.location, //self.location becomes the Google-provided URL to PUT to
			headers: {
				'Authorization': 'Bearer ' + self.tokens.access_token,
				'Content-Type': mimeMe,
				'Content-Length': lenUp,

				'Content-Range': 'bytes '+ self.byteCount+
								  '-'+ (lenUp+ self.byteCount -1)+ '/'+ lenMe
			},
			body: dataUp
		};
		request.put(options, function (err, response, body) {
			if(err){
				clearInterval(poolPut);
				uploadPipe.abort();
				if ((self.retry > 0) || (self.retry <= -1)) {
					self.retry--;
					return self.send();
				} else {
					return self.emit('error', new Error('Max upload retry, reason: network2'));
				}
			}
			var statusCode = response.statusCode;
			var statusCodeX = parseInt(statusCode/100);
			if(statusCode === 401){
				self.emit('warn', new Error('Error gApi access token2'));
				clearInterval(poolPut);
				uploadPipe.abort();
				require('./token').get(function(err, data){
					if(err) {
						return self.emit('error', err); // refresh token error
					} else {
						if(debug) console.log('new token2:', data);
						self.tokens = data;
						return self.send();
					}
				})
			} else if(statusCode===308){
				self.byteCount+= lenUp;
			} else if(statusCodeX===5){
				self.emit('warn', new Error(body || 'Error gApi server side'));
				clearInterval(poolPut);
				uploadPipe.abort();
				return self.send();
			} else if(statusCodeX==2){
				clearInterval(poolPut);
				uploadPipe.abort();
				return self.emit('success', body);
			}
			else {
				clearInterval(poolPut);
				uploadPipe.abort();
				self.emit('error', new Error( body || 'Loi khong xac dinh'));
			}
		})
	}, 300);
}

resumableUpload.prototype.getSessionOld = function () {
	if(!self.location) return;
    var self = this;
    var lenMe = (self.filepath)? fs.statSync(self.filepath).size : self.leech.length;
	var options = {
		url: self.location,
		headers: {
			'Authorization': 'Bearer ' + self.tokens.access_token,
			'Content-Length': 0,
			'Content-Range': 'bytes */' + lenMe
		}
	};
	request.put(options, function (err, res, b) {
		if(err) return;
		if(res.statusCode==401) return; // The access token you're using is either expired or invalid
		if (res && typeof res.headers.range !== 'undefined') {
			var tmp = res.headers.range;
			tmp= tmp.substr(tmp.indexOf('-')+1);
			if(isFinite(tmp)&& parseInt(tmp)>0){
				self.byteCount = parseInt(tmp)+ 1;
			}
			else self.byteCount = 0;
		} else {
			self.byteCount = 0;
		}
	});
}

module.exports = resumableUpload;
