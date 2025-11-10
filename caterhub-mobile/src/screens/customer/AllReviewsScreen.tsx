import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchCatererReviews, getCatererRating, ReviewWithUser } from '../../services/reviews';
import RatingStars from '../../components/common/RatingStars';

export default function AllReviewsScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { catererId, catererName } = route.params;

  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [rating, setRating] = useState({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [catererId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const [reviewsData, ratingData] = await Promise.all([
        fetchCatererReviews(catererId),
        getCatererRating(catererId)
      ]);
      setReviews(reviewsData);
      setRating(ratingData);
    } catch (error) {
      console.error('[AllReviewsScreen] Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Reviews</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#FF8000" />
        ) : (
          <>
            {/* Rating Summary */}
            <Card style={styles.summaryCard}>
              <Card.Content>
                <Text style={styles.catererName}>{catererName}</Text>
                <View style={styles.ratingContainer}>
                  <View style={styles.ratingLeft}>
                    <Text style={styles.ratingNumber}>{rating.averageRating.toFixed(1)}</Text>
                    <RatingStars rating={rating.averageRating} size={24} />
                    <Text style={styles.reviewCount}>
                      Based on {rating.totalReviews} {rating.totalReviews === 1 ? 'review' : 'reviews'}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* All Reviews */}
            <View style={styles.reviewsContainer}>
              <Text style={styles.sectionTitle}>
                All Reviews ({reviews.length})
              </Text>

              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <Card key={review.id} style={styles.reviewCard}>
                    <Card.Content>
                      <View style={styles.reviewHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewerName}>
                            {review.users?.username || 'Anonymous'}
                          </Text>
                          <RatingStars rating={review.rating} size={16} />
                        </View>
                        <Text style={styles.reviewDate}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      {review.comment && (
                        <Text style={styles.reviewComment}>{review.comment}</Text>
                      )}
                    </Card.Content>
                  </Card>
                ))
              ) : (
                <Text style={styles.noReviews}>No reviews yet</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    elevation: 2,
  },
  catererName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingLeft: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FF8000',
    marginBottom: 8,
  },
  reviewCount: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
  },
  reviewsContainer: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  reviewCard: {
    marginBottom: 12,
    borderRadius: 8,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  reviewComment: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginTop: 8,
  },
  noReviews: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    marginTop: 24,
  },
});
