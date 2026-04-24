"use client";

import { useState, useMemo, useCallback } from "react";
import type { WidgetService, TimeSlot, BlockedSlot } from "@/core/entities";

export type WizardStep = "service" | "datetime" | "details" | "success";

export interface CustomerForm {
  name: string;
  email: string;
  phone: string;
}

export interface WizardState {
  step: WizardStep;
  selectedService: WidgetService | null;
  selectedDate: Date | null;
  selectedSlot: TimeSlot | null;
  form: CustomerForm;
  touched: Record<keyof CustomerForm, boolean>;
  submitting: boolean;
  apiError: string;
  blockedSlots: BlockedSlot[];
  loadingSlots: boolean;
}

export function useWidgetWizard() {
  const [state, setState] = useState<WizardState>({
    step: "service",
    selectedService: null,
    selectedDate: null,
    selectedSlot: null,
    form: { name: "", email: "", phone: "" },
    touched: { name: false, email: false, phone: false },
    submitting: false,
    apiError: "",
    blockedSlots: [],
    loadingSlots: false,
  });

  const validation = useMemo(
    () => ({
      name: state.form.name.trim().length >= 3,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.form.email),
      phone: state.form.phone.length === 0 || /^\+?[0-9\s()-]{8,18}$/.test(state.form.phone),
    }),
    [state.form]
  );

  const isFormValid = validation.name && validation.email && validation.phone;

  const selectService = useCallback((service: WidgetService) => {
    setState((prev) => ({
      ...prev,
      step: "datetime",
      selectedService: service,
      selectedDate: null,
      selectedSlot: null,
      blockedSlots: [],
    }));
  }, []);

  const selectDate = useCallback((date: Date) => {
    setState((prev) => ({
      ...prev,
      selectedDate: date,
      selectedSlot: null,
    }));
  }, []);

  const selectSlot = useCallback((slot: TimeSlot) => {
    setState((prev) => ({ ...prev, selectedSlot: slot }));
  }, []);

  const goToStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const updateField = useCallback((field: keyof CustomerForm, value: string) => {
    setState((prev) => ({
      ...prev,
      form: { ...prev.form, [field]: value },
    }));
  }, []);

  const markTouched = useCallback((field: keyof CustomerForm) => {
    setState((prev) => ({
      ...prev,
      touched: { ...prev.touched, [field]: true },
    }));
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    setState((prev) => ({ ...prev, submitting }));
  }, []);

  const setApiError = useCallback((apiError: string) => {
    setState((prev) => ({ ...prev, apiError }));
  }, []);

  const setBlockedSlots = useCallback((blockedSlots: BlockedSlot[]) => {
    setState((prev) => ({ ...prev, blockedSlots, loadingSlots: false }));
  }, []);

  const setLoadingSlots = useCallback((loadingSlots: boolean) => {
    setState((prev) => ({ ...prev, loadingSlots }));
  }, []);

  const restart = useCallback(() => {
    setState({
      step: "service",
      selectedService: null,
      selectedDate: null,
      selectedSlot: null,
      form: { name: "", email: "", phone: "" },
      touched: { name: false, email: false, phone: false },
      submitting: false,
      apiError: "",
      blockedSlots: [],
      loadingSlots: false,
    });
  }, []);

  return {
    state,
    validation,
    isFormValid,
    selectService,
    selectDate,
    selectSlot,
    goToStep,
    updateField,
    markTouched,
    setSubmitting,
    setApiError,
    setBlockedSlots,
    setLoadingSlots,
    restart,
  };
}
