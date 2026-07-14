path = 'C:/Users/Administrator/Desktop/抖音文案助手/index.html'
c = open(path, 'r', encoding='utf-8').read()

# Fix: replace old error handling with new JSON-based one
old_err = "if(!r.ok){var e=await r.text();throw new Error('API\\u9519\\u8bef('+r.status+'): '+e);}"
# The \\u is literal backslash-u in Python string = \u in the file
new_err = "var rem=r.headers.get('X-RateLimit-Remaining');if(rem!==null){var ucEl=document.getElementById('usageCnt');if(ucEl)ucEl.textContent='\u4eca\u65e5\u5269\u4f59\uff1a'+rem+'\u6b21';}if(!r.ok){var e=await r.json();throw new Error(e.error||'\u8bf7\u6c42\u5931\u8d25('+r.status+')');}"
# The \uXXXX is Python unicode escapes = actual Chinese characters

if old_err in c:
    c = c.replace(old_err, new_err)
    open(path, 'w', encoding='utf-8').write(c)
    print('OK: replaced error handling')
    print('Found:', repr(old_err[:60]))
else:
    print('NOT FOUND')
    # Try to find where it is
    idx = c.find("if(!r.ok)")
    if idx >= 0:
        print('Found at', idx, ':', c[idx:idx+100])
    else:
        print('if(!r.ok) not found at all')
