path = 'C:/Users/Administrator/Desktop/抖音文案助手/index.html'
c = open(path, 'r', encoding='utf-8').read()

# Find the duplicate: two remaining checks on the same line
# Pattern: ...;}var rem=r.headers.get('X-RateLimit-Remaining');...今日剩余...;}var d=await r.json()
# Need to remove the SECOND occurrence

# The duplicate is: after the closing }); of error check, before var d=await
dup_start = "}var rem=r.headers.get('X-RateLimit-Remaining');"
dup_end = "}var d=await r.json();"

idx1 = c.find(dup_start)
if idx1 >= 0:
    idx2 = c.find(dup_start, idx1 + len(dup_start))
    if idx2 >= 0:
        end_section = c.find('}var d=await r.json();', idx2)
        if end_section >= 0 and end_section < idx2 + 200:
            # Remove from dup_start at idx2 to before }var d=await
            dup_text = c[idx2:end_section]
            c = c.replace(dup_text, '}')
            open(path, 'w', encoding='utf-8').write(c)
            print('OK: removed duplicate')
        else:
            print('End not found at', end_section)
    else:
        print('Second occurrence not found')
else:
    print('First occurrence not found')
