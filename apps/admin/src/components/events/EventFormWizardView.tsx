'use client';

import { motion } from 'framer-motion';
import { EventReviewSection } from '@/app/events/new/_components/EventReviewSection';
import { EventBasicInfoCard } from './EventBasicInfoCard';
import { EventAdditionalDetailsCard } from './EventAdditionalDetailsCard';
import { EventScheduleCard } from './EventScheduleCard';
import { EventTicketingCard } from './EventTicketingCard';
import { EventRequirementsCard } from './EventRequirementsCard';
import { EventMediaCard } from './EventMediaCard';
import type { useEventFormState } from './useEventFormState';

interface EventFormWizardViewProps {
  activeStep: number;
  formState: ReturnType<typeof useEventFormState>;
  onEditStep?: (step: number) => void;
}

export function EventFormWizardView({
  activeStep,
  formState,
  onEditStep,
}: EventFormWizardViewProps) {
  const {
    title,
    setTitle,
    category,
    setCategory,
    venue,
    setVenue,
    description,
    setDescription,
    dbCategories,
    countryCode,
    setCountryCode,
    convenienceFee,
    setConvenienceFee,
    taxPercentage,
    setTaxPercentage,
    organizerName,
    setOrganizerName,
    highlightsInput,
    setHighlightsInput,
    refundPolicy,
    setRefundPolicy,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    bookingStartDate,
    setBookingStartDate,
    bookingEndDate,
    setBookingEndDate,
    ticketingType,
    setTicketingType,
    tiers,
    addTier,
    removeTier,
    updateTier,
    selectedProfileId,
    setSelectedProfileId,
    overrides,
    handleOverrideChange,
    dbTiers,
    dbProfiles,
    activeProfile,
    tags,
    setTags,
    requireTerms,
    setRequireTerms,
    requireAgeConfirmation,
    setRequireAgeConfirmation,
    ageRestriction,
    setAgeRestriction,
    bannerImage,
    setBannerImage,
    posterImage,
    setPosterImage,
    galleryImages,
    setGalleryImages,
    status,
  } = formState;

  return (
    <>
      {/* STEP 1: Basic Information */}
      {activeStep === 0 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <EventBasicInfoCard
            title={title}
            setTitle={setTitle}
            category={category}
            setCategory={setCategory}
            venue={venue}
            setVenue={setVenue}
            description={description}
            setDescription={setDescription}
            dbCategories={dbCategories}
            hideStatus
            countryCode={countryCode}
            setCountryCode={setCountryCode}
            convenienceFee={convenienceFee}
            setConvenienceFee={setConvenienceFee}
            taxPercentage={taxPercentage}
            setTaxPercentage={setTaxPercentage}
          />
          <EventAdditionalDetailsCard
            organizerName={organizerName}
            setOrganizerName={setOrganizerName}
            highlightsInput={highlightsInput}
            setHighlightsInput={setHighlightsInput}
            refundPolicy={refundPolicy}
            setRefundPolicy={setRefundPolicy}
          />
        </motion.div>
      )}

      {/* STEP 2: Schedule */}
      {activeStep === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <EventScheduleCard
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            bookingStartDate={bookingStartDate}
            setBookingStartDate={setBookingStartDate}
            bookingEndDate={bookingEndDate}
            setBookingEndDate={setBookingEndDate}
          />
        </motion.div>
      )}

      {/* STEP 3: Ticket Configuration & Requirements */}
      {activeStep === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <EventTicketingCard
            countryCode={countryCode}
            ticketingType={ticketingType}
            setTicketingType={setTicketingType}
            tiers={tiers}
            onAddTier={addTier}
            onRemoveTier={removeTier}
            onUpdateTier={updateTier}
            selectedProfileId={selectedProfileId}
            setSelectedProfileId={setSelectedProfileId}
            overrides={overrides}
            onOverrideChange={handleOverrideChange}
            dbTiers={dbTiers}
            dbProfiles={dbProfiles}
            activeProfile={activeProfile}
            eventTitle={title}
          />
          <EventRequirementsCard
            tags={tags}
            setTags={setTags}
            requireTerms={requireTerms}
            setRequireTerms={setRequireTerms}
            requireAgeConfirmation={requireAgeConfirmation}
            setRequireAgeConfirmation={setRequireAgeConfirmation}
            ageRestriction={ageRestriction}
            setAgeRestriction={setAgeRestriction}
          />
        </motion.div>
      )}

      {/* STEP 4: Media Uploads */}
      {activeStep === 3 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <EventMediaCard
            bannerImage={bannerImage}
            setBannerImage={setBannerImage}
            posterImage={posterImage}
            setPosterImage={setPosterImage}
            galleryImages={galleryImages}
            setGalleryImages={setGalleryImages}
          />
        </motion.div>
      )}

      {/* STEP 5: Review & Publish */}
      {activeStep === 4 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <EventReviewSection
            title={title}
            category={category}
            description={description}
            venueName={venue}
            status={status}
            startDate={startDate}
            endDate={endDate}
            bookingStartDate={bookingStartDate}
            bookingEndDate={bookingEndDate}
            requireTerms={requireTerms}
            requireAgeConfirmation={requireAgeConfirmation}
            ageRestriction={ageRestriction}
            tags={tags}
            countryCode={countryCode}
            ticketingType={ticketingType}
            tiers={tiers}
            selectedProfileId={selectedProfileId}
            coverImage={bannerImage}
            posterImage={posterImage}
            onEditStep={onEditStep}
          />
        </motion.div>
      )}
    </>
  );
}
