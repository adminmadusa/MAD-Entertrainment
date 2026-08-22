'use client';

import { EventBasicInfoCard } from './EventBasicInfoCard';
import { EventAdditionalDetailsCard } from './EventAdditionalDetailsCard';
import { EventScheduleCard } from './EventScheduleCard';
import { EventTicketingCard } from './EventTicketingCard';
import { EventRequirementsCard } from './EventRequirementsCard';
import { EventMediaCard } from './EventMediaCard';
import type { useEventFormState } from './useEventFormState';

interface EventFormStackedViewProps {
  formState: ReturnType<typeof useEventFormState>;
}

export function EventFormStackedView({ formState }: EventFormStackedViewProps) {
  const {
    bannerImage,
    setBannerImage,
    posterImage,
    setPosterImage,
    galleryImages,
    setGalleryImages,
    title,
    setTitle,
    category,
    setCategory,
    status,
    setStatus,
    lifecycle,
    venue,
    setVenue,
    description,
    setDescription,
    dbCategories,
    statusOptions,
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
    requireTerms,
    setRequireTerms,
    requireAgeConfirmation,
    setRequireAgeConfirmation,
    ageRestriction,
    setAgeRestriction,
    tags,
    setTags,
  } = formState;

  return (
    <>
      <EventMediaCard
        bannerImage={bannerImage}
        setBannerImage={setBannerImage}
        posterImage={posterImage}
        setPosterImage={setPosterImage}
        galleryImages={galleryImages}
        setGalleryImages={setGalleryImages}
      />

      <EventBasicInfoCard
        title={title}
        setTitle={setTitle}
        category={category}
        setCategory={setCategory}
        status={status}
        setStatus={setStatus}
        lifecycle={lifecycle}
        venue={venue}
        setVenue={setVenue}
        description={description}
        setDescription={setDescription}
        dbCategories={dbCategories}
        statusOptions={statusOptions}
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
        requireTerms={requireTerms}
        setRequireTerms={setRequireTerms}
        requireAgeConfirmation={requireAgeConfirmation}
        setRequireAgeConfirmation={setRequireAgeConfirmation}
        ageRestriction={ageRestriction}
        setAgeRestriction={setAgeRestriction}
        tags={tags}
        setTags={setTags}
      />
    </>
  );
}
