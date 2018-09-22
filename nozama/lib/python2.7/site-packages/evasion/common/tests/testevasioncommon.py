# -*- coding: utf-8 -*-
"""
"""
import socket
import logging
import unittest

from evasion.common import log
from evasion.common import net
from evasion.common import signal
from evasion.common import webhelpers



class CommonTC(unittest.TestCase):


    def setUp(self):
        self.stop_needed = []

    def tearDown(self):
        [i.stop() for i in self.stop_needed]


    def testLog(self):
        """Calling log.to_console() shouldn't raise errors."""
        l = log.to_console()
        self.assertTrue(isinstance(l, logging.Logger))


    def testSignal(self):
        """Test the helper code provided by signal.
        """
        c = signal.CallBack(timeout=1)

        # Test the timeout waiting raises WaitTimeout
        self.assertRaises(signal.WaitTimeout, c.wait)
        self.assertEquals(c.data, None)

        # Test the timeout doesn't occur when the callback
        # is invoked.
        c(1)
        c.wait()
        self.assertEquals(c.data, 1)


    def testWaitForReadyLive(self):
        """Test wait for ready against a basic local web service.
        """
        # Get a free port to use for this test:
        port1 = net.get_free_port()

        web = webhelpers.BasicWeb(port=port1)
        self.stop_needed.append(web)

        # Run the web app and wait for ready should connect:
        web.start()
        result = net.wait_for_ready(web.uri)
        self.assertEquals(result, True)


    def testWaitForServiceLive(self):
        """Test wait for service against a basic local web service.
        """
        # Get a free port to use for this test:
        port1 = net.get_free_port()

        web = webhelpers.BasicWeb(port=port1)
        self.stop_needed.append(web)

        # Run the web app and wait for ready should connect:
        web.start()
        result = net.wait_for_service('localhost', port1)
        self.assertEquals(result, True)

        result = net.wait_for_service('localhost', port1, retries=1)
        self.assertEquals(result, True)


    def testNetTools(self):
        """Test as much of the net helper tools as I can.
        """
        # Recover a free port to construct a uri for a ficticious web servce
        # we can test the fail path of the wait_for_ready with:
        port = net.get_free_port()

        class XYZ(object):
            def __init__(self, port):
                self.port = port
            def freeport_range(self):
                return self.port

        fpr = XYZ(port)

        gport = net.get_free_port(fp=fpr.freeport_range)
        self.assertEquals(gport, port)

        # use the port
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('localhost', port))

        # Now exlucde this port and try again.
        self.assertRaises(net.NoFreePort, net.get_free_port, exclude_ports=[port], fp=fpr.freeport_range)

        s.close()

        # Recover a free port to construct a uri for a ficticious web servce
        # we can test the fail path of the wait_for_ready with:
        port = net.get_free_port()
        ficticious_uri = "http://localhost:%d" % port

        # Use this made up uri and see it did indeed NOT manage to connect:
        result = net.wait_for_ready(ficticious_uri, retries=1)
        self.assertEquals(result, False)

        # Use this made up uri and see it did indeed NOT manage to connect:
        result = net.wait_for_service('localhost', port, retries=1)
        self.assertEquals(result, False)