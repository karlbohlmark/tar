#!/usr/local/bin/python

from flup.server.fcgi import WSGIServer
from tarserve import app
WSGIServer(app).run()
