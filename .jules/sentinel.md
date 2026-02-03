## 2024-05-28 - [HTML Injection in Email Generation]
**Vulnerability:** User input in the `message` field was being converted to HTML by simply replacing newlines with `<br>`, without escaping other HTML characters. This allowed users to inject arbitrary HTML, including scripts (XSS) or malicious links.
**Learning:** This is a common pattern when trying to format user input as simple HTML. Developers often forget that `<` and `>` are valid characters in user input that have special meaning in HTML.
**Prevention:** Always escape user input before applying any HTML formatting (like `replace(/\n/g, '<br>')`). Use a dedicated sanitization library or a simple escape function for plain text conversion.
