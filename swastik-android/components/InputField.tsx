// mobile/components/InputField.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  TextInputProps 
} from 'react-native';
import { Colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export const InputField: React.FC<Props> = ({
  label,
  error,
  iconName,
  isPassword = false,
  style,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(!isPassword);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, !!error && styles.errorWrapper]}>
        {iconName && (
          <Ionicons 
            name={iconName} 
            size={18} 
            color={Colors.muted} 
            style={styles.icon} 
          />
        )}
        <TextInput
          placeholderTextColor="#94a3b8"
          secureTextEntry={isPassword && !showPassword}
          style={[styles.input, style]}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
          >
            <Ionicons 
              name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
              size={18} 
              color={Colors.muted} 
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 46,
  },
  errorWrapper: {
    borderColor: Colors.red,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.navy,
    height: '100%',
  },
  eyeButton: {
    padding: 6,
  },
  errorText: {
    fontSize: 11,
    color: Colors.red,
    marginTop: 3,
  },
});
