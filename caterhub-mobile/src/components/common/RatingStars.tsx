import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingStarsProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
  showNumber?: boolean;
  color?: string;
}

export default function RatingStars({
  rating,
  onRatingChange,
  size = 24,
  readonly = false,
  showNumber = false,
  color = '#FFB800',
}: RatingStarsProps) {
  const stars = [1, 2, 3, 4, 5];

  const handlePress = (star: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(star);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {stars.map((star) => {
          const isFilled = star <= rating;
          const isHalfFilled = star === Math.ceil(rating) && rating % 1 !== 0;

          return (
            <TouchableOpacity
              key={star}
              onPress={() => handlePress(star)}
              disabled={readonly}
              activeOpacity={readonly ? 1 : 0.7}
              style={styles.starButton}
            >
              {isHalfFilled ? (
                <Ionicons name="star-half" size={size} color={color} />
              ) : (
                <Ionicons
                  name={isFilled ? 'star' : 'star-outline'}
                  size={size}
                  color={isFilled ? color : '#D1D5DB'}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {showNumber && (
        <Text style={[styles.ratingText, { fontSize: size * 0.6 }]}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    marginRight: 4,
  },
  ratingText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#374151',
  },
});
