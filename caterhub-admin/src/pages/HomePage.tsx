import React from "react";
import { Container } from "../components/ui/Container";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { COLORS } from "../constants/colors";

interface HomePageProps {
  onNavigate: () => void;
}

const HERO_BG = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80";
const PATTERN_BG = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80";

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div>
      {/* Hero Section */}
      <div
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, rgba(200, 54, 249, 0.9) 0%, rgba(123, 31, 162, 0.8) 100%)",
          }}
        />
        <Container>
          <div style={{ position: "relative", zIndex: 1, textAlign: "center", color: "white" }}>
            <h1 style={{ 
              fontSize: "48px", 
              fontWeight: "900", 
              marginBottom: "20px",
              textShadow: "0 2px 4px rgba(0,0,0,0.3)"
            }}>
              Cater to Every Occasion
            </h1>
            <p style={{ 
              fontSize: "20px", 
              marginBottom: "32px", 
              opacity: 0.9,
              maxWidth: "600px",
              margin: "0 auto 32px auto"
            }}>
              Connect with professional caterers for your events. From intimate gatherings to grand celebrations.
            </p>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
              <Button
                label="Find Caterers"
                variant="solid"
                size="lg"
                invert
                onPress={() => alert("Find caterers feature coming soon!")}
              />
              <Button
                label="Become a Partner"
                variant="outline"
                size="lg"
                invert
                onPress={onNavigate}
              />
            </div>
          </div>
        </Container>
      </div>

      {/* Categories Section */}
      <div style={{ padding: "80px 0", backgroundColor: COLORS.bg }}>
        <Container>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2 style={{ fontSize: "36px", fontWeight: "900", marginBottom: "16px", color: COLORS.text }}>
              Event Categories
            </h2>
            <p style={{ fontSize: "18px", color: COLORS.textLight, maxWidth: "600px", margin: "0 auto" }}>
              We cater to all types of events and celebrations
            </p>
          </div>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
            gap: "24px" 
          }}>
            {[
              { title: "Weddings", description: "Elegant dining for your special day", icon: "💒" },
              { title: "Corporate Events", description: "Professional catering for business", icon: "🏢" },
              { title: "Birthday Parties", description: "Fun and festive celebrations", icon: "🎂" },
              { title: "Holiday Gatherings", description: "Seasonal feasts and traditions", icon: "🎄" },
            ].map((category, index) => (
              <Card key={index} pad={24}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>{category.icon}</div>
                  <h3 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "12px", color: COLORS.text }}>
                    {category.title}
                  </h3>
                  <p style={{ color: COLORS.textLight, lineHeight: "1.6" }}>
                    {category.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </div>

      {/* How It Works Section */}
      <div style={{ padding: "80px 0", backgroundColor: COLORS.white }}>
        <Container>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2 style={{ fontSize: "36px", fontWeight: "900", marginBottom: "16px", color: COLORS.text }}>
              How It Works
            </h2>
            <p style={{ fontSize: "18px", color: COLORS.textLight, maxWidth: "600px", margin: "0 auto" }}>
              Simple steps to find the perfect caterer for your event
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "40px" }}>
            {[
              { step: "1", title: "Browse Caterers", description: "Explore our network of professional caterers" },
              { step: "2", title: "Compare Options", description: "Review menus, prices, and reviews" },
              { step: "3", title: "Book & Enjoy", description: "Secure your booking and enjoy your event" },
            ].map((item, index) => (
              <div key={index} style={{ textAlign: "center" }}>
                <div style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "30px",
                  backgroundColor: COLORS.primary,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: "900",
                  margin: "0 auto 20px auto"
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "12px", color: COLORS.text }}>
                  {item.title}
                </h3>
                <p style={{ color: COLORS.textLight, lineHeight: "1.6" }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* CTA Section */}
      <div style={{ padding: "80px 0", backgroundColor: COLORS.primary, color: "white" }}>
        <Container>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "36px", fontWeight: "900", marginBottom: "20px" }}>
              Ready to Get Started?
            </h2>
            <p style={{ fontSize: "18px", marginBottom: "32px", opacity: 0.9 }}>
              Join thousands of satisfied customers who trust CaterHub for their events
            </p>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
              <Button
                label="Browse Caterers"
                variant="solid"
                size="lg"
                invert
                onPress={() => alert("Browse caterers feature coming soon!")}
              />
              <Button
                label="Partner with Us"
                variant="outline"
                size="lg"
                invert
                onPress={onNavigate}
              />
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};