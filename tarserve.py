import csv
import os
import mimetypes
import sys

segmentCache = dict()

basePath = "/Users/karboh/apple_advanced"

def app (environ, start_response):
    status = '200 OK'

    path = environ["PATH_INFO"][1:]

    if os.path.exists(path):
        response_headers = [
            ('X-Sendfile', "%s" % path),
            ('Content-Type', mimetypes.guess_type(path)[0])
        ]
        start_response(status, response_headers)
        return []

    if not path in segmentCache:
        loadIndex(getIndexPath(path))

    segmentInfo = segmentCache[path]
    archivePath = getArchivePath(path)

    offset = segmentInfo[0]
    length = segmentInfo[1]

    r = environ.get("HTTP_RANGE")

    if r:
        parts = r.split('=')[1].split('-')
        segmentOffset = int(parts[0])
        offset = offset + segmentOffset
        if len(parts) > 1:
            length = int(parts[1]) - segmentOffset
        else:
            length = length - segmentOffset

    # sys.stderr.write (archivePath)
    # sys.stderr.write (str(segmentInfo))
    # sys.stderr.write ("%s %i-%i" % (archivePath, offset, offset + length))
    # sys.stderr.write(path)

    response_headers = [
        ('X-Sendfile2', "%s %i-%i" % (archivePath, offset, offset + length)),
        ('Content-Type', mimetypes.guess_type(path)[0])
    ]
    start_response(status, response_headers)
    return []

def loadIndex (indexPath):
    with open(indexPath, 'rb') as csvfile:
        indexReader = csv.reader(csvfile, delimiter=',')
        for row in indexReader:
            offset = int(row[0])
            length = int(row[1])
            segmentCache[row[2]] = [offset, length]

def getIndexPath (url):
    return "rec.idx"

def getArchivePath (url):
    return "rec.tar"
