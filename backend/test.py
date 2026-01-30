from urllib.parse import quote

userNickname = "T1 Gumayusi"
tagLine = "월즈쓰리핏"
encodedName = quote(userNickname)
encodedTag = quote(tagLine)

print("userNickname:", userNickname)
print("tagLine:", tagLine)
print("encodedName:", encodedName)
print("encodedTag:", encodedTag)