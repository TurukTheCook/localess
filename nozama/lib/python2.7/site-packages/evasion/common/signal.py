# -*- coding: utf-8 -*-
"""
:mod:`signal` -- This provides handy signal utilities.
======================================================

.. module:: evasion.common.signal
   :platform: Unix, MacOSX, Windows
   :synopsis: This provides handy utiliy functions for network services.
.. moduleauthor:: Oisin Mulvihill <oisin.mulvihill@gmail.com>

.. autoclass:: evasion.common.signal.CallBack

"""
import threading


class WaitTimeout(Exception):
    """Raised by CallBack.wait if it timeout before receiving a call."""


class CallBack(object):
    """Helpful message catcher to allow testing of asynchronous messages.

    self.data will contain the captured data.

    """
    def __init__(self, timeout=180):
        self.waiter = threading.Event()
        self.data = None
        self.timeout = int(timeout)

    def wait(self):
        """Wait for self.timeout seconds or raise ValueError on timeout."""
        self.waiter.wait(self.timeout)
        if not self.data:
            raise WaitTimeout("The callback never called before timeout.")
        # reset for next run:
        self.waiter.clear()

    def __call__(self, data):
        """Callback invoked, store given data as self.data."""
        self.data = data
        self.waiter.set()

