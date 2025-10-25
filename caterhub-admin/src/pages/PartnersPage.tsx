import React from "react";
import { Container } from "../components/ui/Container";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { Stepper } from "../components/ui/Stepper";
import { Chip } from "../components/ui/Chip";
import { COLORS } from "../constants/colors";
import { StepKey, PartnerForm } from "../types";

interface PartnersPageProps {
  step: StepKey;
  form: PartnerForm;
  onFormChange: (updates: Partial<PartnerForm>) => void;
  onStepNext: () => void;
  onStepPrev: () => void;
  onSubmit: () => void;
  onNavigate: () => void;
}

const CUISINE_OPTIONS = [
  "Filipino", "Chinese", "Japanese", "Korean", "Italian", "American", 
  "Mexican", "Indian", "Thai", "Mediterranean", "Fusion", "Vegetarian"
];

const PACKAGE_OPTIONS = [
  "Appetizers", "Main Course", "Desserts", "Beverages", "Full Service", 
  "Buffet Style", "Plated Service", "Cocktail Reception"
];

export const PartnersPage: React.FC<PartnersPageProps> = ({
  step,
  form,
  onFormChange,
  onStepNext,
  onStepPrev,
  onSubmit,
  onNavigate,
}) => {
  const renderHero = () => (
    <div style={{ 
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      color: "white",
      padding: "80px 0",
      textAlign: "center"
    }}>
      <Container>
        <h1 style={{ fontSize: "48px", fontWeight: "900", marginBottom: "20px" }}>
          Join Our Catering Network
        </h1>
        <p style={{ fontSize: "20px", marginBottom: "32px", opacity: 0.9 }}>
          Partner with us and grow your catering business
        </p>
        <Button
          label="Start Application"
          variant="solid"
          size="lg"
          onPress={onStepNext}
          style={{ backgroundColor: "white", color: COLORS.primary }}
        />
      </Container>
    </div>
  );

  const renderStep1 = () => (
    <Container>
      <div style={{ padding: "40px 0" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "900", marginBottom: "32px", color: COLORS.text }}>
          Business Information
        </h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          <Field
            label="Business Name"
            value={form.businessName}
            onChangeText={(value) => onFormChange({ businessName: value })}
            placeholder="Enter your business name"
          />
          
          <Field
            label="City"
            value={form.city}
            onChangeText={(value) => onFormChange({ city: value })}
            placeholder="Enter your city"
          />
          
          <Field
            label="Address"
            value={form.address}
            onChangeText={(value) => onFormChange({ address: value })}
            placeholder="Enter your business address"
            multiline
          />
          
          <Field
            label="Website"
            value={form.website}
            onChangeText={(value) => onFormChange({ website: value })}
            placeholder="https://your-website.com"
            keyboardType="url"
          />
          
          <Field
            label="Years in Business"
            value={form.years}
            onChangeText={(value) => onFormChange({ years: value })}
            placeholder="e.g., 5 years"
          />
          
          <Field
            label="Price per Head"
            value={form.pricePerHead}
            onChangeText={(value) => onFormChange({ pricePerHead: value })}
            placeholder="e.g., ₱500-800"
          />
        </div>

        <div style={{ marginTop: "32px" }}>
          <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", color: COLORS.text }}>
            Cuisine Types
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {CUISINE_OPTIONS.map((cuisine) => (
              <Chip
                key={cuisine}
                text={cuisine}
                active={form.cuisines.includes(cuisine)}
                onPress={() => {
                  const newCuisines = form.cuisines.includes(cuisine)
                    ? form.cuisines.filter(c => c !== cuisine)
                    : [...form.cuisines, cuisine];
                  onFormChange({ cuisines: newCuisines });
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", marginTop: "40px", justifyContent: "flex-end" }}>
          <Button label="Back" variant="outline" onPress={onStepPrev} />
          <Button label="Next" variant="solid" onPress={onStepNext} />
        </div>
      </div>
    </Container>
  );

  const renderStep2 = () => (
    <Container>
      <div style={{ padding: "40px 0" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "900", marginBottom: "32px", color: COLORS.text }}>
          Owner & Contact Information
        </h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          <Field
            label="Owner Name"
            value={form.ownerName}
            onChangeText={(value) => onFormChange({ ownerName: value })}
            placeholder="Enter owner's full name"
          />
          
          <Field
            label="Phone Number"
            value={form.ownerPhone}
            onChangeText={(value) => onFormChange({ ownerPhone: value })}
            placeholder="+63 912 345 6789"
            keyboardType="tel"
          />
          
          <Field
            label="Email Address"
            value={form.ownerEmail}
            onChangeText={(value) => onFormChange({ ownerEmail: value })}
            placeholder="owner@business.com"
            keyboardType="email"
          />
        </div>

        <h3 style={{ fontSize: "24px", fontWeight: "700", marginTop: "40px", marginBottom: "24px", color: COLORS.text }}>
          Banking Information
        </h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          <Field
            label="Bank Name"
            value={form.bankName}
            onChangeText={(value) => onFormChange({ bankName: value })}
            placeholder="e.g., BDO, BPI, Metrobank"
          />
          
          <Field
            label="Account Name"
            value={form.bankAccountName}
            onChangeText={(value) => onFormChange({ bankAccountName: value })}
            placeholder="Account holder name"
          />
          
          <Field
            label="Account Number"
            value={form.bankAccountNumber}
            onChangeText={(value) => onFormChange({ bankAccountNumber: value })}
            placeholder="Account number"
            keyboardType="numeric"
          />
        </div>

        <div style={{ display: "flex", gap: "16px", marginTop: "40px", justifyContent: "flex-end" }}>
          <Button label="Back" variant="outline" onPress={onStepPrev} />
          <Button label="Next" variant="solid" onPress={onStepNext} />
        </div>
      </div>
    </Container>
  );

  const renderStep3 = () => (
    <Container>
      <div style={{ padding: "40px 0" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "900", marginBottom: "32px", color: COLORS.text }}>
          Menu & Packages
        </h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          <Field
            label="Minimum Guests"
            value={form.minGuests}
            onChangeText={(value) => onFormChange({ minGuests: value })}
            placeholder="e.g., 20"
            keyboardType="numeric"
          />
          
          <Field
            label="Maximum Guests"
            value={form.maxGuests}
            onChangeText={(value) => onFormChange({ maxGuests: value })}
            placeholder="e.g., 500"
            keyboardType="numeric"
          />
          
          <Field
            label="Operating Hours"
            value={form.hours}
            onChangeText={(value) => onFormChange({ hours: value })}
            placeholder="e.g., 8 AM - 10 PM"
          />
        </div>

        <div style={{ marginTop: "32px" }}>
          <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", color: COLORS.text }}>
            Package Types
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {PACKAGE_OPTIONS.map((pkg) => (
              <Chip
                key={pkg}
                text={pkg}
                active={form.packages.includes(pkg)}
                onPress={() => {
                  const newPackages = form.packages.includes(pkg)
                    ? form.packages.filter(p => p !== pkg)
                    : [...form.packages, pkg];
                  onFormChange({ packages: newPackages });
                }}
              />
            ))}
          </div>
        </div>

        <Field
          label="Sample Menu"
          value={form.sampleMenu}
          onChangeText={(value) => onFormChange({ sampleMenu: value })}
          placeholder="Describe your signature dishes and menu offerings..."
          multiline
        />

        <div style={{ display: "flex", gap: "16px", marginTop: "40px", justifyContent: "flex-end" }}>
          <Button label="Back" variant="outline" onPress={onStepPrev} />
          <Button label="Next" variant="solid" onPress={onStepNext} />
        </div>
      </div>
    </Container>
  );

  const renderStep4 = () => (
    <Container>
      <div style={{ padding: "40px 0" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "900", marginBottom: "32px", color: COLORS.text }}>
          Compliance & Policies
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.permitsReady}
              onChange={(e) => onFormChange({ permitsReady: e.target.checked })}
              style={{ width: "20px", height: "20px" }}
            />
            <span style={{ fontSize: "16px", color: COLORS.text }}>
              I have all necessary business permits and licenses
            </span>
          </label>
          
          <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.foodSafety}
              onChange={(e) => onFormChange({ foodSafety: e.target.checked })}
              style={{ width: "20px", height: "20px" }}
            />
            <span style={{ fontSize: "16px", color: COLORS.text }}>
              I follow proper food safety and hygiene standards
            </span>
          </label>
          
          <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.agreeTerms}
              onChange={(e) => onFormChange({ agreeTerms: e.target.checked })}
              style={{ width: "20px", height: "20px" }}
            />
            <span style={{ fontSize: "16px", color: COLORS.text }}>
              I agree to the terms and conditions
            </span>
          </label>
        </div>

        <Field
          label="Additional Notes"
          value={form.notes}
          onChangeText={(value) => onFormChange({ notes: value })}
          placeholder="Any additional information or special requirements..."
          multiline
        />

        <div style={{ display: "flex", gap: "16px", marginTop: "40px", justifyContent: "flex-end" }}>
          <Button label="Back" variant="outline" onPress={onStepPrev} />
          <Button label="Next" variant="solid" onPress={onStepNext} />
        </div>
      </div>
    </Container>
  );

  const renderStep5 = () => (
    <Container>
      <div style={{ padding: "40px 0" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "900", marginBottom: "32px", color: COLORS.text }}>
          Review Your Application
        </h2>
        
        <Card pad={24}>
          <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px", color: COLORS.text }}>
            Business Information
          </h3>
          <p><strong>Name:</strong> {form.businessName}</p>
          <p><strong>Location:</strong> {form.city}, {form.address}</p>
          <p><strong>Website:</strong> {form.website}</p>
          <p><strong>Years in Business:</strong> {form.years}</p>
          <p><strong>Price Range:</strong> {form.pricePerHead}</p>
          <p><strong>Cuisines:</strong> {form.cuisines.join(", ")}</p>
        </Card>

        <div style={{ display: "flex", gap: "16px", marginTop: "40px", justifyContent: "flex-end" }}>
          <Button label="Back" variant="outline" onPress={onStepPrev} />
          <Button label="Submit Application" variant="solid" onPress={onSubmit} />
        </div>
      </div>
    </Container>
  );

  const renderSuccess = () => (
    <Container>
      <div style={{ padding: "80px 0", textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>🎉</div>
        <h1 style={{ fontSize: "48px", fontWeight: "900", marginBottom: "20px", color: COLORS.text }}>
          Application Submitted!
        </h1>
        <p style={{ fontSize: "20px", color: COLORS.textLight, marginBottom: "32px", maxWidth: "600px", margin: "0 auto 32px auto" }}>
          Thank you for your interest in joining our catering network. We'll review your application and get back to you within 3-5 business days.
        </p>
        <Button
          label="Back to Home"
          variant="solid"
          size="lg"
          onPress={onNavigate}
        />
      </div>
    </Container>
  );

  const getCurrentStep = () => {
    const steps = ["hero", "step1", "step2", "step3", "step4", "step5", "success"];
    return steps.indexOf(step);
  };

  return (
    <div>
      {step === "hero" && renderHero()}
      {step === "step1" && (
        <div>
          <div style={{ padding: "40px 0", backgroundColor: COLORS.bg }}>
            <Container>
              <Stepper current={1} />
            </Container>
          </div>
          {renderStep1()}
        </div>
      )}
      {step === "step2" && (
        <div>
          <div style={{ padding: "40px 0", backgroundColor: COLORS.bg }}>
            <Container>
              <Stepper current={2} />
            </Container>
          </div>
          {renderStep2()}
        </div>
      )}
      {step === "step3" && (
        <div>
          <div style={{ padding: "40px 0", backgroundColor: COLORS.bg }}>
            <Container>
              <Stepper current={3} />
            </Container>
          </div>
          {renderStep3()}
        </div>
      )}
      {step === "step4" && (
        <div>
          <div style={{ padding: "40px 0", backgroundColor: COLORS.bg }}>
            <Container>
              <Stepper current={4} />
            </Container>
          </div>
          {renderStep4()}
        </div>
      )}
      {step === "step5" && (
        <div>
          <div style={{ padding: "40px 0", backgroundColor: COLORS.bg }}>
            <Container>
              <Stepper current={5} />
            </Container>
          </div>
          {renderStep5()}
        </div>
      )}
      {step === "success" && renderSuccess()}
    </div>
  );
};