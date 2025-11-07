import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Card } from './Card';
import { COLORS } from '../../constants/colors';

interface StepperProps {
  current: number;
}

export const Stepper: React.FC<StepperProps> = ({ current }) => {
  const items = ['Account', 'Business', 'Owner', 'Compliance', 'Review'];
  const isMobile = Platform.OS !== 'web';

  // Mobile: Show compact stepper with current step highlighted
  if (isMobile) {
    return (
      <View style={styles.mobileContainer}>
        <View style={styles.mobileProgressBar}>
          <View 
            style={[
              styles.mobileProgressFill, 
              { width: `${((current - 1) / (items.length - 1)) * 100}%` }
            ]} 
          />
        </View>
        <View style={styles.mobileStepInfo}>
          <View style={styles.mobileStepNumber}>
            <Text style={styles.mobileStepNumberText}>{current}</Text>
            <Text style={styles.mobileStepTotal}>/{items.length}</Text>
          </View>
          <View style={styles.mobileStepLabelContainer}>
            <Text style={styles.mobileStepLabel}>{items[current - 1]}</Text>
            <Text style={styles.mobileStepSubtext}>Step {current} of {items.length}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Web: Show full stepper
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
  // Mobile styles
  mobileContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mobileProgressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  mobileProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  mobileStepInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileStepNumber: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: 12,
  },
  mobileStepNumberText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
  },
  mobileStepTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
    marginLeft: 2,
  },
  mobileStepLabelContainer: {
    flex: 1,
  },
  mobileStepLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  mobileStepSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});

