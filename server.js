var http = require('http')
var fs = require('fs')
var path = require('path')

var mime = require('mime')
var csv = require("fast-csv")

var server = http.createServer(function (req, res) {
	var path = resolvePath(req.url)

	fs.stat(path, function (err, stat) {
		if (stat) {
			if (stat.isDirectory()) {
				res.writeHead(403, 'forbidden', {
					'content-type': 'text/plain',
					'content-length': 'forbidden'.length
				})
				return res.end('forbidden')
			}

			var type = mime.lookup(path)
			res.setHeader('content-type', type)
			var fileStream = fs.createReadStream(path)
			fileStream.pipe(res)
			fileStream.on('end', function () {
				res.end()
			})
		} else {
			serveArchiveRequest(req, res)
		}
	});
})


function serveArchiveRequest (req, res) {
	var url = req.url
	var indexPath = resolveIndexPath(url)
	fs.exists(indexPath, function (exists) {
		if (exists) {
			res.setHeader('content-type', 'text/plain')
			csv(indexPath)
				.on("data", function(data){
					res.write(JSON.stringify(data))
				})
				.on("end", function(){
					console.log("done")
					res.end()
				})
			.parse()
		} else {
			var body = 'could not find ' + req.url
			res.writeHead(404, {
				'content-type': 'text/plain',
				'content-length': Buffer.byteLength(body)
			})
			res.end(body)
		}
	})
}

function resolvePath (url) {
	return path.resolve(path.join('./', url))
}

function resolveArchivePath (url) {
	return path.resolve(path.join('./', url))
}

function resolveIndexPath (url) {
	return path.resolve(path.join('./', url))
}

// function readIndex  (index) {
// 	var contents = yield readFile(index);

// }


server.listen(8484)
console.log('listening on 8484')

