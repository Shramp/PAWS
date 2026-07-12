import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';

/** Small sheet asking for a single line of text (cross-platform Alert.prompt). */
export function PromptSheet({
  visible,
  ...props
}: {
  visible: boolean;
  title: string;
  placeholder?: string;
  onSubmit: (text: string) => void;
  onClose: () => void;
}) {
  // Mount fresh on each open so state starts clean.
  if (!visible) return null;
  return <PromptSheetContent {...props} />;
}

function PromptSheetContent({
  title,
  placeholder,
  onSubmit,
  onClose,
}: {
  title: string;
  placeholder?: string;
  onSubmit: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={title}>
      <TextField
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        autoFocus
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Button label="Save" onPress={submit} disabled={!text.trim()} />
    </Sheet>
  );
}
