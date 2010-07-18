import string
import socket
import array
from types import *
from struct import pack
from collections import deque

def utf8_len(value):
    "calculate numbers of characters in string"
    src_len = len(value)
    length = 0
    pos = 0
    
    while pos < src_len:
        c = ord(value[pos])
        if (c & 0x80) == 0x00:   pos += 1
        elif (c & 0xE0) == 0xC0: pos += 2
        elif (c & 0xF0) == 0xE0: pos += 3
        elif (c & 0xF8) == 0xF0: pos += 4
        else: raise RuntimeError, "invalid utf8 in string"
        length += 1
    if pos != src_len:
        raise RuntimeError, "invalid utf8 in string"

    return length
    
def utf8_pos(value, pos, offset=0):
    "find byte position of specific character in string"
    src_len = len(value) - offset
    length = 0
    p = offset
    
    while length < pos and p < src_len:
        c = ord(value[p])
        if (c & 0x80) == 0x00:   p += 1
        elif (c & 0xE0) == 0xC0: p += 2
        elif (c & 0xF0) == 0xE0: p += 3
        elif (c & 0xF8) == 0xF0: p += 4
        else: raise RuntimeError, "invalid utf8 in string"
        length += 1
    if length != pos:
        raise RuntimeError, "invalid utf8 in string"

    return p - offset

#
# HessianWriter - writes Hessian data from Python objects
#
class HessianWriter:
    dispatch = {}

    def write_call(self, method, params):
        self.refs = {}
        self.ref = 0
        self.__out = []
        self.write = write = self.__out.append

        write("C");
        self.write_object(method); # can be either unicode or utf8
        
        self.write_int(len(params))
        for v in params:
            self.write_object(v)
            
        result = string.join(self.__out, "")
        del self.__out, self.write, self.refs
        return result

    def write_object(self, value):
        try:
            f = self.dispatch[type(value)]
        except KeyError:
            if isinstance(value, RemoteObjectProxy):
                self.write_proxy_handle(value.handle)
            else:
                raise TypeError, "cannot write %s objects" % type(value)
        else:
            f(self, value)
            
    def write_bool(self, value):
        if value: self.write('T')
        else: self.write('F')
    dispatch[BooleanType] = write_bool

    def write_int(self, value):
        if -0x10 <= value <= 0x2f:
            # pack in single octet
            self.write(pack(">B", 0x90 + value))
        elif -0x800 <= value  <= 0x7ff:
            # pack in two octets
            self.write(pack(">B", 0xc8 + ((value >> 8) & 0x000000FF)))
            self.write(pack(">B", value & 0x000000FF))
        elif -0x40000 <= value <= 0x3ffff:
            # pack in three octets
            self.write(pack(">B", 0xd4 + ((value >> 16) & 0x000000FF)))
            self.write(pack(">B", (value >> 8) & 0x000000FF))
            self.write(pack(">B", value & 0x000000FF))
        else:
            self.write('I')
            self.write(pack(">B", value >> 24))
            self.write(pack(">B", (value >> 16) & 0x000000FF))
            self.write(pack(">B", (value >> 8) & 0x000000FF))
            self.write(pack(">B", value & 0x000000FF))
    dispatch[IntType] = write_int
    
    def write_proxy_handle(self, handle):
        self.write('P')
        self.write_int(handle)
    
    def write_utf8_string(self, value):
        length = utf8_len(value)
        
        if length == 0: self.write(pack(">B", 0x00))
        else:
            offset = 0
            
            # split in chunks
            while length > 0x8000:
                sublen = 0x8000
                bytelen = utf8_pos(value, 0x8000, offset)
                
                # chunk can't end in high surrogate
                tail_16 = ord(value[offset + bytelen - 2])
                tail_8 = ord(value[offset + bytelen - 1])
                tail = (tail_16 << 8) + tail_8
                if 0xd800 <= tail <= 0xdbff:
                    sublen -= 1
                    bytelen -= 2
                    
                self.write('R')
                self.write(pack(">B", (sublen >> 8) & 0x000000FF))
                self.write(pack(">B", sublen & 0x000000FF))
                self.write(value[offset:offset+bytelen])
                
                length -= sublen
                offset += bytelen
                
            if length <= 0x1f:
                # single octet length
                self.write(pack(">B", length))
                self.write(value[offset:])
            elif length <= 0x3ff:
                # length packed in two octets
                self.write(pack(">B", 0x30 + ((length >> 8) & 0x000000FF)))
                self.write(pack(">B", length & 0x000000FF))
                self.write(value[offset:])
            else:
                # tag + double octets
                self.write('I')
                self.write(pack(">B", (length >> 8) & 0x000000FF))
                self.write(pack(">B", length & 0x000000FF))
                self.write(value[offset:])
    dispatch[StringType] = write_utf8_string
                
    def write_unicode_string(self, value):
        utf8str = value.encode("utf-8")
        write_utf8_string(utf8str)
    dispatch[UnicodeType] = write_unicode_string

class Fault:
    pass
    
class Notifier:
    pass
    
class _SavedState:
    def __init__(self, state, result, len_left):
        self.state = state
        self.result = result
        self.len_left = len_left
        
class RemoteObjectProxy:
    _proxy = None
    handle = 0
    def SetHandle(self, value):
        self.handle = value
    def __getattr__(self, name):
        if name[0] == "_":
            raise AttributeError, name
        else:
            method = getattr(self._proxy, name)
            method.add_id(self)
            return method
        
class HessianReader:
    STATE_START = 0
    STATE_VALUE_START = 1
    STATE_INT_1 = 2
    STATE_INT_2 = 3
    STATE_INT_3 = 4
    STATE_INT_4 = 5
    STATE_STRING_LEN1 = 6
    STATE_STRING_LEN2 = 7
    STATE_STRING_DATA = 8
    STATE_STRING_CHAR1 = 9
    STATE_STRING_CHAR2 = 10
    STATE_STRING_CHAR3 = 11
    STATE_LIST = 12
    STATE_LIST_FIXED = 13
    STATE_MAP = 14
    STATE_FAULT = 15
    STATE_ENDMARKER = 16
    STATE_NOTIFIER = 17
    STATE_BIN_LEN1 = 18
    STATE_BIN_LEN2 = 19
    STATE_BIN_DATA = 20
    STATE_PROXY = 21
    
    def __init__(self):
        self.reset()
        self.pos = 0
        self.end = 0
        
    def reset(self):
        self.state = self.STATE_START
        self.len_left = 0
        self.result = None
        self.statestack = []
        
    def add_data(self, data):
        self.data = data
        self.pos = 0
        self.end = len(data)
        
    def need_data(self):
        return self.pos >= self.end
        
    def read_packed_size(self, value, byte):
        value = (value << 7) + byte
        if byte & 0x80:
            value -= 0x80 # last byte has bit 7 set
            return True
        else:
            return False
            
    def write_packed_size(self, value):
        n = 7
        while (value >> n) and n < 32:
            n += 7
            
        while n:
            n -= 7
            byte = (value >> n) & 0x7F
            if n == 0:
                byte |= 0x80 # set bit 7 on the last byte
        
        
    def parse(self):
        if len(self.data) == 0: return False # need more input
        
        #print "parsing %d %d %d" % (self.pos, self.end, self.len_left)
        
        while (self.pos < self.end):
            if self.state >= self.STATE_VALUE_START:
                if not self.parse_value():
                    return False # need more input
                    
                if type(self.result) == ListType or type(self.result) == DictType or self.state == self.STATE_PROXY:
                    self.statestack.append(_SavedState(self.state, self.result, self.len_left))
                    
                    self.state = self.STATE_VALUE_START
                    self.len_left = 0
                    self.result = None
                    continue

                while len(self.statestack):
                    needmore = True
                    savedstate = self.statestack[-1]
                    if savedstate.state == self.STATE_LIST:
                        if self.state == self.STATE_ENDMARKER:
                            needmore = False
                        else:
                            savedstate.result.append(self.result)
                    elif savedstate.state == self.STATE_LIST_FIXED:
                        savedstate.result.append(self.result)
                        savedstate.len_left -= 1
                        if savedstate.len_left == 0:
                            needmore = False
                    elif savedstate.state == self.STATE_MAP:
                        if self.state == self.STATE_ENDMARKER:
                            needmore = False
                        elif savedstate.len_left == 0:
                            savedstate.key = self.result
                            savedstate.len_left = 1
                        elif savedstate.len_left == 1:
                            savedstate.result[savedstate.key] = self.result
                            savedstate.len_left = 0
                    elif savedstate.state == self.STATE_FAULT:
                        savedstate.result.map = self.result
                        needmore = False
                    elif savedstate.state == self.STATE_NOTIFIER:
                        if savedstate.len_left == 0:
                            savedstate.result.id = self.result
                            savedstate.len_left = 1
                        elif savedstate.len_left == 1:
                            savedstate.result.result = self.result
                            needmore = False
                    elif savedstate.state == self.STATE_PROXY:
                        savedstate.result.SetHandle(self.result)
                        needmore = False
                                                
                    self.state = self.STATE_VALUE_START
                    if needmore:
                        self.len_left = 0
                        self.result = None
                        break
                    else:
                        self.result = savedstate.result
                        self.statestack.pop()
                
                if len(self.statestack) == 0:
                    return True # parsing complete
            
            if self.state == self.STATE_START:
                c = ord(self.data[self.pos])
                self.pos += 1
                
                if c == ord('R'):
                    self.state = self.STATE_VALUE_START
                    continue # to parse the values
                elif c == ord('F'):
                    self.statestack.append(_SavedState(self.STATE_FAULT, Fault(), 0))
                    self.state = self.STATE_VALUE_START
                    continue # to parse the values
                elif c == ord('N'):
                    self.statestack.append(_SavedState(self.STATE_NOTIFIER, Notifier(), 0))
                    self.state = self.STATE_VALUE_START
                    continue # to parse the values
                else:
                    raise RuntimeError, "invalid data at %d - %s" % (self.pos-1, self.data)
                    
    def parse_value(self):
        while (self.pos < self.end):
            c = ord(self.data[self.pos])
            self.pos += 1
            
            #print "c(%s)= %d %s - %d/%d" % (self.pos, c, data[self.pos-1], self.len_left, self.end)
            
            if self.state == self.STATE_VALUE_START:
                if c == ord('N'):
                    self.result = None
                    return True
                
                # Booleans
                elif c == ord('T'):
                    self.result = True
                    return True
                elif c == ord('F'):
                    self.result = False
                    return True
                    
                # Integer (packed in one octet)
                elif 0x80 <= c <= 0xbf:
                    self.result = c - 0x90
                    return True
                # Integer (packed in two octets)
                elif 0xc0 <= c <= 0xcf:
                    self.result = (c - 0xc8) << 8
                    self.state = self.STATE_INT_4
                    continue
               # Integer (packed in three octets)
                elif 0xd0 <= c <= 0xd7:
                    self.result = (c - 0xd4) << 16
                    self.state = self.STATE_INT_3
                    continue
                # Integer (tag + 4 octets)
                elif c == ord('I'):
                    self.result = 0
                    self.state = self.STATE_INT_1
                    continue
                    
                # Empty string
                elif c == 0:
                    self.result = ""
                    return True
                # String (length packed in one octet)
                elif 0x01 <= c <= 0x1f:
                    if self.result == None:
                        self.result = array.array('c')
                    self.state = self.STATE_STRING_DATA
                    self.len_left = c
                    continue
                # String (length packed in two octets)
                elif 0x30 <= c <= 0x33:
                    if self.result == None:
                        self.result = array.array('c')
                    self.state = self.STATE_STRING_LEN2
                    self.len_left = (c - 0x30) << 8
                    continue
                # String (tag + len in 2 octets)
                elif c == ord('S'):
                    if self.result == None:
                        self.result = array.array('c')
                    self.state = self.STATE_STRING_LEN1
                    continue
                    
                # Binary (length packed in one octet)
                elif 0x20 <= c <= 0x2f:
                    if self.result == None:
                        self.result = array.array('c')
                    self.len_left = c - 0x20
                    
                    # append as much data as possible from input
                    if self.AppendData(): return True
                    self.state = self.STATE_BIN_DATA
                    continue
                # Binary (final chunk)
                elif c == ord('B'):
                    if self.result == None:
                        self.result = array.array('c')
                    self.state = self.STATE_BIN_LEN1
                    continue
                    
                    
                # Variable length untyped list
                elif c == 0x57:
                    self.state = self.STATE_LIST
                    self.result = []
                    return True
                    
                # Map
                elif c == ord('H'):
                    self.state = self.STATE_MAP
                    self.result = {}
                    return True
                
                # End sentinel    
                elif c == ord('Z'):
                    self.state = self.STATE_ENDMARKER
                    return True
                    
                elif c == ord('P'):
                    self.state = self.STATE_PROXY
                    self.result = RemoteObjectProxy()
                    return True
               
                else: raise RuntimeError, "invalid data at %d" % (self.pos-1,)
            
            
            # Integer states    
            elif self.state == self.STATE_INT_1:
                self.result += c << 24
                self.state = self.STATE_INT_2
                continue
            elif self.state == self.STATE_INT_2:
                self.result += c << 16
                self.state = self.STATE_INT_3
                continue
            elif self.state == self.STATE_INT_3:
                self.result += c << 8
                self.state = self.STATE_INT_4
                continue
            elif self.state == self.STATE_INT_4:
                self.result += c
                return True
                
            # String states    
            elif self.state == self.STATE_STRING_LEN1:
                self.len_left = c << 8
                self.state = self.STATE_STRING_LEN2
                continue
            elif self.state == self.STATE_STRING_LEN2:
                self.len_left += c
                self.state = self.STATE_STRING_DATA
                continue
            elif self.state == self.STATE_STRING_DATA:
                if (c & 0x80) == 0x00:
                    self.result.append(chr(c))
                    self.len_left -= 1
                    if self.len_left == 0:
                        self.result = self.result.tostring()
                        return True
                    continue
                elif (c & 0xE0) == 0xC0:
                    self.result.append(chr(c))
                    self.state = self.STATE_STRING_CHAR1
                    continue
                elif (c & 0xF0) == 0xE0:
                    self.result.append(chr(c))
                    self.state = self.STATE_STRING_CHAR2
                    continue
                elif (c & 0xF8) == 0xF0:
                    self.result.append(chr(c))
                    self.state = self.STATE_STRING_CHAR3
                    continue
                else: raise RuntimeError, "invalid utf8 in string"
            elif self.state == self.STATE_STRING_CHAR1:
                self.result.append(chr(c))
                self.len_left -= 1
                if self.len_left == 0:
                    self.result = self.result.tostring()
                    return True
                self.state = self.STATE_STRING_DATA
                continue
            elif self.state == self.STATE_STRING_CHAR2:
                self.result.append(chr(c))
                self.state = self.STATE_STRING_CHAR1
                continue
            elif self.state == self.STATE_STRING_CHAR3:
                self.result.append(chr(c))
                self.state = self.STATE_STRING_CHAR2
                continue
                
            # Binary states
            elif self.state == self.STATE_BIN_LEN1:
                self.len_left = c << 8
                self.state = self.STATE_BIN_LEN2
                continue
            elif self.state == self.STATE_BIN_LEN2:
                self.len_left += c
                
                # append as much data as possible from input
                if self.AppendData(): return True
                
                self.state = self.STATE_BIN_DATA
                continue
            elif self.state == self.STATE_BIN_DATA:
                # append as much data as possible from input
                self.pos -= 1
                if self.AppendData(): return True
                continue
                
    def AppendData(self):
        # append as much data as possible from input
        part_len = min(self.len_left, self.end - self.pos)
        if part_len:
            d = self.data[self.pos:self.pos+part_len]
            self.result.extend(d)
            self.len_left -= part_len
            self.pos += part_len
            
        if self.len_left == 0:
            self.result = self.result.tostring()
            return True
        else: return False # more data left
        

#
# Encapsulates the method to be called
#
class _Method:
    def __init__(self, proxy, invoker, method):
        self._proxy = proxy
        self._invoker = invoker
        self._method = method
        self._args = ()
        
    def add_id(self, obj_id):
        self._args = (obj_id,)

    def __call__(self, *args):
        # notifiers have handler as first arg
        if len(args) and type(args[0]) == FunctionType:
            handler = args[0]
            args = self._args + args[1:]
            notifier_id = self._invoker(self._method, args)
            self._proxy.add_handler(notifier_id, handler)
            return
        else:    
            args = self._args + args
            return self._invoker(self._method, args)

class Hessian:
    """Represents a remote object reachable by Hessian"""

    def __init__(self):
        self.s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.s.connect(('localhost', 9000))
        self.reader = HessianReader()
        self.notifiers = deque()
        self.handlers = {}

    def __invoke(self, method, params):
        "call a method on the remote server"
        
        request = HessianWriter().write_call(method, params)
        self.s.send(request)
        
        # read the response
        self.reader.reset()
        while True:
            if self.reader.need_data():
                data = self.s.recv(1024)
                self.reader.add_data(data)
                
                #print "recieved:"
                #print data
                
            if self.reader.parse():
                if isinstance(self.reader.result, Notifier):
                    # put notifiers on queue for later
                    self.notifiers.append(self.reader.result)
                    self.reader.reset()
                else: break #request complete
            
        if isinstance(self.reader.result, Fault):
            raise RuntimeError, "Hessian_ipc Fault: %s" % (self.reader.result.map["message"],)
        elif isinstance(self.reader.result, RemoteObjectProxy):
            self.reader.result._proxy = self
            
        return self.reader.result
    
    def __getattr__(self, name):
        if name[0] == "_":
            raise AttributeError, name
        else:
            # encapsulate the method call
            return _Method(self, self.__invoke, name)
        
    def add_handler(self, notifier_id, handler):
        self.handlers[notifier_id] = handler
        
    def _process_notifier(self, notifier):
        if not self.handlers.has_key(notifier.id):
            return True
        
        if notifier.result == None:
            del self.handlers[notifier.id]
            if len(self.handlers) == 0:
                return False # stop listening for notifiers
        
        self.handlers[notifier.id](notifier.id, notifier.result)
        return True
        
        
    def handle_notifiers(self):
        # process any queued notifiers
        while len(self.notifiers):
            n = self.notifiers.popleft()
            if not self._process_notifier(n):
                return # no more notifers to handle
                
        # read incomming notifiers
        self.reader.reset()
        while True:
            if self.reader.need_data():
                data = self.s.recv(1024)
                self.reader.add_data(data)
                
            if self.reader.parse():
                n = self.reader.result
                if not self._process_notifier(n):
                    return # no more notifers to handle
                self.reader.reset()
#
# Testing code.
#
if __name__ == "__main__":
    e = Hessian()
    
    editor = e.get_the_active_editor()
    pos = e.editor_getpos(editor)
    text = e.editor_gettext(editor)
    
    sel = html_matcher.match(text, pos)
    if not sel[0] == None:
        e.editor_select(editor, sel[0], sel[1])

