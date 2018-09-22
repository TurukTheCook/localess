#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Provides helper logging set up functions.

"""
import logging


def to_console(default_log_level=logging.DEBUG):
    """Returns a logger configured for console outputs.

    :param default_log_level: logging.DEBUG by default.

    :returns: A logging.getLogger() root logger instance.

     """
    log = logging.getLogger()
    hdlr = logging.StreamHandler()
    fmt = '%(asctime)s %(name)s %(levelname)s %(message)s'
    formatter = logging.Formatter(fmt)
    hdlr.setFormatter(formatter)
    log.addHandler(hdlr)
    log.setLevel(logging.DEBUG)
    log.propagate = False

    return log