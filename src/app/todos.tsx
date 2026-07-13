import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { addTodo, completeTodo, deleteTodo, listTodos, uncompleteTodo } from '@/db/todos';
import { type Todo } from '@/db/types';
import { useDbData } from '@/hooks/use-db-data';
import { useTabContentPadding } from '@/hooks/use-tab-content-padding';
import { dateKey, shortDate } from '@/lib/dates';

export default function TodosScreen() {
  const bottomPadding = useTabContentPadding();
  const { data: todos, reload, db } = useDbData(listTodos);
  const [addOpen, setAddOpen] = useState(false);
  const [completing, setCompleting] = useState<Todo | null>(null);

  const open = (todos ?? []).filter((t) => t.completedAtMs === null);
  const done = (todos ?? []).filter((t) => t.completedAtMs !== null);

  const onPressCompleted = (todo: Todo) => {
    Alert.alert(todo.title, todo.completionNote ?? undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reopen',
        onPress: async () => {
          await uncompleteTodo(db, todo.id);
          reload();
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTodo(db, todo.id);
          reload();
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
          <Button label="+ New todo" onPress={() => setAddOpen(true)} />

          {open.map((todo) => (
            <Pressable key={todo.id} onPress={() => setCompleting(todo)}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText>{todo.title}</ThemedText>
                {todo.description ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {todo.description}
                  </ThemedText>
                ) : null}
                <ThemedText type="code" themeColor="textSecondary">
                  added {shortDate(dateKey(new Date(todo.createdAtMs)))}
                </ThemedText>
              </ThemedView>
            </Pressable>
          ))}
          {open.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Nothing to do. 🐾
            </ThemedText>
          ) : null}

          {done.length > 0 ? (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              COMPLETED
            </ThemedText>
          ) : null}
          {done.map((todo) => (
            <Pressable key={todo.id} onPress={() => onPressCompleted(todo)}>
              <ThemedView type="backgroundElement" style={[styles.card, styles.doneCard]}>
                <ThemedText style={styles.doneTitle}>✓ {todo.title}</ThemedText>
                {todo.completionNote ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {todo.completionNote}
                  </ThemedText>
                ) : null}
                <ThemedText type="code" themeColor="textSecondary">
                  done {shortDate(dateKey(new Date(todo.completedAtMs!)))}
                </ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      {addOpen ? (
        <AddTodoSheet
          onClose={() => setAddOpen(false)}
          onAdd={async (title, description) => {
            await addTodo(db, title, description);
            reload();
            setAddOpen(false);
          }}
        />
      ) : null}

      {completing ? (
        <CompleteTodoSheet
          todo={completing}
          onClose={() => setCompleting(null)}
          onComplete={async (note) => {
            await completeTodo(db, completing.id, note);
            reload();
            setCompleting(null);
          }}
        />
      ) : null}
    </ThemedView>
  );
}

function AddTodoSheet({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (title: string, description: string | null) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <Sheet visible onClose={onClose} title="New todo">
      <TextField label="Title" value={title} onChangeText={setTitle} autoFocus />
      <TextField label="Description (optional)" value={description} onChangeText={setDescription} multiline />
      <Button
        label="Add"
        onPress={() => onAdd(title.trim(), description.trim() || null)}
        disabled={!title.trim()}
      />
    </Sheet>
  );
}

function CompleteTodoSheet({
  todo,
  onClose,
  onComplete,
}: {
  todo: Todo;
  onClose: () => void;
  onComplete: (note: string | null) => void;
}) {
  const [note, setNote] = useState('');

  return (
    <Sheet visible onClose={onClose} title={`Complete “${todo.title}”`}>
      <TextField label="Note (optional)" value={note} onChangeText={setNote} multiline autoFocus />
      <Button label="Mark completed" onPress={() => onComplete(note.trim() || null)} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Spacing.two,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  doneCard: {
    opacity: 0.6,
  },
  doneTitle: {
    textDecorationLine: 'line-through',
  },
  sectionTitle: {
    marginTop: Spacing.three,
    letterSpacing: 1,
  },
  empty: {
    textAlign: 'center',
    padding: Spacing.four,
  },
});
