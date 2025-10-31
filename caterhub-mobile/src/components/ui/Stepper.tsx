import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { COLORS } from '../../constants/colors';

interface StepperProps {
  current: number;
}

export const Stepper: React.FC<StepperProps> = ({ current }) => {
  const items = ['Business', 'Owner', 'Compliance', 'Review', 'Account'];

  return (
    <Card pad={16}>
      <View style={styles.container}>
        <View style={styles.stepsContainer}>
          {items.map((title, index) => {
            const stepNumber = index + 1;
            const isDone = current > stepNumber;
            const isActive = current === stepNumber;

            return (
              <React.Fragment key={title}>
                <View style={styles.stepWrapper}>
                  <View
                    style={[
                      styles.stepCircle,
                      {
                        backgroundColor: isDone || isActive ? COLORS.primary : COLORS.white,
                        borderColor: isDone || isActive ? COLORS.primary : COLORS.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepNumber,
                        {
                          color: isDone || isActive ? '#fff' : COLORS.textLight,
                        },
                      ]}
                    >
                      {stepNumber}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color: isActive ? COLORS.primary : isDone ? COLORS.text : COLORS.textLight,
                        fontWeight: isActive ? '900' : '600',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                </View>
                {index < items.length - 1 && (
                  <View
                    style={[
                      styles.connector,
                      {
                        backgroundColor: isDone ? COLORS.primary : COLORS.border,
                      },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepNumber: {
    fontWeight: '900',
    fontSize: 14,
  },
  stepLabel: {
    textAlign: 'center',
    fontSize: 12,
  },
  connector: {
    flex: 1.1,
    height: 2,
    borderRadius: 2,
    marginHorizontal: 2,
  },
});

