cd "/Users/tetamo/Desktop/tetamo-mobile"

python3 <<'PY'
from pathlib import Path

path = Path("app/scorpio-assist.tsx")
text = path.read_text()

if "function getDisplayMessageText(" not in text:
    text = text.replace(
'''const MESSAGE_SELECT =
  "id, conversation_id, sender_type, message_text, ai_status, suggested_action, suggested_action_label, created_at";''',
'''const MESSAGE_SELECT =
  "id, conversation_id, sender_type, message_text, ai_status, suggested_action, suggested_action_label, created_at";

function getDisplayMessageText(value: string, language: Language) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed[language] === "string" &&
      parsed[language].trim()
    ) {
      return parsed[language].trim();
    }

    const fallbackLanguage: Language = language === "id" ? "en" : "id";

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed[fallbackLanguage] === "string" &&
      parsed[fallbackLanguage].trim()
    ) {
      return parsed[fallbackLanguage].trim();
    }
  } catch {
    return raw;
  }

  return raw;
}'''
    )

text = text.replace(
'''{message.message_text}''',
'''{getDisplayMessageText(message.message_text, language)}'''
)

path.write_text(text)
print("Patched mobile Scorpio bilingual display.")
PY

npx prettier --write app/scorpio-assist.tsx 2>/dev/null || true

git status
git add app/scorpio-assist.tsx
git commit -m "Display bilingual Scorpio replies by selected language"
git push
git status