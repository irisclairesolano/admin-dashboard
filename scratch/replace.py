import os
import re

file_path = 'C:/Users/user/.antigravity/capstone project/sikap-admin/src/app/dashboard/users/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(".replace('_', ' ')", ".replace(/_/g, ' ')")
content = content.replace("import { AlertDialog } from '@/components/AlertDialog';", "import { AlertDialog } from '@/components/AlertDialog';\nimport VerificationModal from '@/components/VerificationModal';")

old_state = '''  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });'''
new_state = '''  const [alertState, setAlertState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [showIdModal, setShowIdModal] = useState(false);'''
content = content.replace(old_state, new_state)

content = re.sub(r'  const confirmAction = \(title: string, message: string, onConfirm: \(\) => void\) => \{[\s\S]*?  \};\n\n  const showAlert = \(title: string, message: string\) => \{[\s\S]*?  \};\n\n', '', content)

content = re.sub(r"alert\('(.+?)' \+ \((.+?)\)\);", r"setAlertState({ open: true, title: 'Error', message: '\1' + (\2), onConfirm: () => setAlertState(s => ({...s, open: false})) });", content)

content = re.sub(r"showAlert\('(.+?)', '(.+?)' \+ \((.+?)\)\);", r"setAlertState({ open: true, title: '\1', message: '\2' + (\3), onConfirm: () => setAlertState(s => ({...s, open: false})) });", content)
content = re.sub(r"showAlert\('(.+?)', '(.+?)'\);", r"setAlertState({ open: true, title: '\1', message: '\2', onConfirm: () => setAlertState(s => ({...s, open: false})) });", content)

# For confirmAction:
# confirmAction(
#   'Title',
#   `Message`,
#   async () => {
#      ...
#   }
# );
# Replace with setAlertState({ open: true, title: 'Title', message: `Message`, onConfirm: async () => { ... } })

content = re.sub(
    r"confirmAction\(\s*'([^']+)',\s*(`[^`]+`|'[^']+'),\s*(async \(\) => \{)",
    r"setAlertState({\n      open: true,\n      title: '\1',\n      message: \2,\n      onConfirm: \3",
    content
)

# And fix the closing for confirmAction
content = re.sub(
    r"\}\s*\);\n\s*};\n",
    r"} })\n  };\n",
    content
)

# Replace alertConfig in AlertDialog
old_alert_dialog = '''      <AlertDialog
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={() => {
          setAlertConfig((prev) => ({ ...prev, isOpen: false }));
          alertConfig.onConfirm();
        }}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />'''
new_alert_dialog = '''      <AlertDialog isOpen={alertState.open} title={alertState.title} message={alertState.message} onConfirm={() => { alertState.onConfirm(); setAlertState(s => ({...s, open: false})); }} onCancel={() => setAlertState(s => ({...s, open: false}))} confirmText="Confirm" cancelText="Cancel" />'''
content = content.replace(old_alert_dialog, new_alert_dialog)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
