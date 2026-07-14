path = 'C:/Users/Administrator/Desktop/抖音文案助手/index.html'
content = open(path, 'r', encoding='utf-8').read()

# 1. Remove hidden apiKey input
old_input = '<input type="hidden" id="apiKey" value="sk-618a14a5512a4f04951f220f3483bb71">'
if old_input in content:
    content = content.replace(old_input, '')
    print('1. Removed apiKey input')
else:
    print('1. apiKey input NOT FOUND')

# 2. Add BACKEND_URL after DAILY_LIMIT
old_limit_start = 'var DAILY_LIMIT=5;var WATERMARK'
old_limit_end = "Zhanzhang091645';"
idx = content.find(old_limit_start)
if idx >= 0:
    end = content.find(old_limit_end, idx) + len(old_limit_end)
    old_text = content[idx:end]
    new_text = 'var DAILY_LIMIT=5;var BACKEND_URL="http://localhost:3000";var WATERMARK' + old_text.split('var WATERMARK')[1]
    content = content.replace(old_text, new_text)
    print('2. Added BACKEND_URL')
else:
    print('2. DAILY_LIMIT line NOT FOUND')

# 3. Replace generate() - remove key check line
old_key_check = 'var key=document.getElementById("apiKey").value.trim();if(!key||!key.startsWith("sk-")){tst("\u8bf7\u586b\u5199\u6709\u6548\u7684API Key");return;}'
if old_key_check in content:
    content = content.replace(old_key_check, '')
    print('3. Removed API key check')
else:
    print('3. API key check NOT FOUND')

# 4. Remove localStorage limit check
old_ls_check = 'var uk="use_"+new Date().toISOString().slice(0,10);var uc=parseInt(localStorage.getItem(uk)||"0");if(uc>=DAILY_LIMIT){tst("\u4eca\u65e5\u514d\u8d39\u6b21\u6570\u5df2\u7528\u5b8c\uff0c\u52a0\u5fae\u4fe1 Zhanzhang091645 \u89e3\u9501\u65e0\u9650\u4f7f\u7528");return;}'
if old_ls_check in content:
    content = content.replace(old_ls_check, '')
    print('4. Removed localStorage check')
else:
    print('4. localStorage check NOT FOUND - trying unicode...')
    # Try with literal characters
    old_ls_check2 = 'var uk="use_"+new Date().toISOString().slice(0,10);var uc=parseInt(localStorage.getItem(uk)||"0");if(uc>=DAILY_LIMIT){tst("今日免费次数已用完，加微信 Zhanzhang091645 解锁无限使用");return;}'
    if old_ls_check2 in content:
        content = content.replace(old_ls_check2, '')
        print('4. Removed localStorage check (literal)')
    else:
        print('4. Still NOT FOUND')

# 5. Change fetch URL
old_fetch = "fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:'deepseek-chat',messages:[{role:'system',content:SYS[curType]},{role:'user',content:inp}],temperature:0.85,max_tokens:3072})});"
if old_fetch in content:
    new_fetch = "fetch(BACKEND_URL+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:SYS[curType],user:inp})});"
    content = content.replace(old_fetch, new_fetch)
    print('5. Changed fetch URL')
else:
    print('5. Fetch URL NOT FOUND')

# 6. Add rate limit reading after fetch
old_r = 'var rem=r.headers.get'
# Insert remaining check after the fetch line
content = content.replace(
    "var d=await r.json();var c=d.choices[0].message.content;",
    "var rem=r.headers.get('X-RateLimit-Remaining');if(rem!==null){var ucEl=document.getElementById('usageCnt');if(ucEl)ucEl.textContent='\u4eca\u65e5\u5269\u4f59\uff1a'+rem+'\u6b21';}var d=await r.json();var c=d.choices[0].message.content;"
)

# 7. Change error handling
old_err = "if(!r.ok){var e=await r.text();throw new Error('\u0041\u0050\u0049\u9519\u8bef('+r.status+'): '+e);}"
new_err = "if(!r.ok){var e=await r.json();throw new Error(e.error||'\u8bf7\u6c42\u5931\u8d25('+r.status+')');}"
if old_err in content:
    content = content.replace(old_err, new_err)
    print('7. Changed error handling')
else:
    # Try with the literal unicode
    print('7. Error handling NOT FOUND with unicode')

# 8. Remove localStorage.setItem
old_save = "localStorage.setItem(uk,uc+1);"
if old_save in content:
    content = content.replace(old_save, '')
    print('8. Removed localStorage.setItem')
else:
    print('8. localStorage.setItem NOT FOUND')

open(path, 'w', encoding='utf-8').write(content)
print('\\nDONE')
