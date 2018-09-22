# -*- coding: utf-8 -*-
"""
This providers some helper webservice classes that can be built on for testing
or generally elsewhere.

"""
import time
import thread
import socket
import logging
import SocketServer
import SimpleHTTPServer



class StoppableTCPServer(SocketServer.TCPServer):
    """Handle requests but check for the exit flag setting periodically.
    """
    log = logging.getLogger('evasion')

    exitTime = False

    allow_reuse_address = True

    def __init__(self, serveraddress, ControlFrameRequest):
        SocketServer.TCPServer.__init__(self, serveraddress, ControlFrameRequest)

    def stop(self):
        self.exitTime = True
        self.log.info("Stop: set exit flag and closed port.")

    def server_bind(self):
        SocketServer.TCPServer.server_bind(self)
        self.socket.settimeout(1)
        self.run = True

    def get_request(self):
        """Handle a request/timeout and check the exit flag.
        """
        while not self.exitTime:
            try:
                returned = self.socket.accept()
                if len(returned) > 1:
                    conn, address = returned
                    conn.settimeout(None)
                    returned = (conn, address)
                return returned
            except socket.timeout:
                pass


class BasicWeb(object):
    """Implements a dump web server I can use in testing.
    """
    def __init__(self, port, interface='localhost'):
        super(BasicWeb, self).__init__()
        self.log = logging.getLogger("evasion")
        self.server = None
        self.port = int(port)
        self.interface = interface
        self.uri = "http://%s:%s" % (interface, port)


    def start(self):
        """Start the uber basic interface.

        All request are handled by BasicWeb method handle_request.

        """
        def make_handler(parent):
            class RequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
                # A super-simple HTTP request handler:
                def do_GET(self):
                    parent.handle_request('GET', self)
                def do_POST(self):
                    parent.handle_request('POST',self)
                def do_PUT(self):
                    parent.handle_request('PUT',self)
                def do_DELETE(self):
                    parent.handle_request('DELETE',self)
                def do_HEAD(self):
                    parent.handle_request('HEAD',self)

            return RequestHandler

        self.log.info("Creating FakeWebServer.")
        self.server = StoppableTCPServer(
            (self.interface, self.port),
            make_handler(self)
        )

        def _start(data=0):
            self.log.info("start: URI<%s>" % self.uri)
            self.server.serve_forever()

        thread.start_new(_start, (0,))


    def stop(self):
        """Stop the web server running.
        """
        if self.server:
            self.server.stop()


    def handle_request(self, method, req, content='OK', mime_type="text/plain"):
        """Return OK 200 response with text/plain OK in the response body.

        Override this method to implement other behaviour.

        """
        body = content
        req.send_response(200)
        req.send_header("Content-type", mime_type)
        req.send_header("Content-Length", len(body))
        last_modified = time.asctime()
        req.send_header("Last-Modified", last_modified)
        req.end_headers()
        req.wfile.write(body)


