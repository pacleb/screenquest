import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, borderRadius, fonts } from '../theme';

interface ParentalGateProps {
  visible: boolean;
  onPass: () => void;
  onDismiss: () => void;
}

function generateProblem(): { question: string; answer: number } {
  const a = Math.floor(Math.random() * 20) + 10;
  const b = Math.floor(Math.random() * 15) + 5;
  return { question: `${a} + ${b}`, answer: a + b };
}

export function ParentalGate({ visible, onPass, onDismiss }: ParentalGateProps) {
  const [problem, setProblem] = useState(generateProblem);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (visible) {
      setProblem(generateProblem());
      setInput('');
      setError(false);
    }
  }, [visible]);

  const handleSubmit = useCallback(() => {
    if (parseInt(input, 10) === problem.answer) {
      onPass();
    } else {
      setError(true);
      setInput('');
    }
  }, [input, problem.answer, onPass]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Parental Verification</Text>
          <Text style={styles.subtitle}>
            Please solve this to continue. This helps keep kids safe.
          </Text>

          <Text style={styles.problem}>What is {problem.question}?</Text>

          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={input}
            onChangeText={(t) => {
              setInput(t);
              setError(false);
            }}
            keyboardType="number-pad"
            placeholder="Your answer"
            placeholderTextColor={colors.textSecondary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            testID="parental-gate-input"
          />

          {error && (
            <Text style={styles.errorText}>
              That's not right. Ask a parent for help!
            </Text>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onDismiss}
              testID="parental-gate-cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, !input && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!input}
              testID="parental-gate-submit"
            >
              <Text style={styles.submitText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.parent.bold,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  problem: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: 20,
    textAlign: 'center',
    color: colors.textPrimary,
    fontWeight: '600',
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
