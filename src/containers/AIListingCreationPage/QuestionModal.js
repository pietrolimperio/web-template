import React, { useState } from 'react';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import LoadingOverlay from './LoadingOverlay';
import css from './QuestionModal.module.css';

/**
 * QuestionModal Component
 *
 * Features:
 * - Full-screen modal overlay
 * - Progress bar (Question X of Y)
 * - Two question types:
 *   - Select: Button-based options with "Other" text field support
 *   - Slider: Numeric range with min/max/unit display
 * - Navigation: Previous, Skip, Skip All, Cancel
 * - Loading overlay during refinement
 */
const QuestionModal = ({
  questions,
  onComplete,
  onSkipAll,
  onCancel,
  isRefining,
  allowSkip = true,
}) => {
  const intl = useIntl();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [otherValue, setOtherValue] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  React.useEffect(() => {
    // Reset state whenever the questions change to avoid stale indices
    setCurrentQuestionIndex(0);
    setAnswers({});
    setOtherValue('');
  }, [questions]);

  if (!questions || questions.length === 0) {
    return null;
  }

  const safeIndex =
    currentQuestionIndex >= 0 && currentQuestionIndex < questions.length
      ? currentQuestionIndex
      : 0;
  const currentQuestion = questions[safeIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isFirstQuestion = safeIndex === 0;
  const isLastQuestion = safeIndex === questions.length - 1;

  // Slider options can be at question.min/max/step or question.options.min/max/step (API format)
  const getSliderOptions = question => ({
    min: question.min ?? question.options?.min ?? 0,
    max: question.max ?? question.options?.max ?? 100,
    step: question.step ?? question.options?.step ?? 1,
    unit: question.unit ?? question.options?.unit ?? '',
  });

  // Calculate initial slider value, rounded to the nearest step
  // e.g., for years (step=1): 2009.5 → 2010, for shoe sizes (step=0.5): 41.5 → 41.5
  // If defaultValue is provided, use it; otherwise use midpoint
  const getInitialSliderValue = question => {
    const { min, max, step } = getSliderOptions(question);
    // Use defaultValue if provided (e.g., from priceSuggestion), otherwise use midpoint
    const baseValue = question.defaultValue !== undefined ? question.defaultValue : (min + max) / 2;
    const value = Math.round(baseValue / step) * step;
    return Number.isFinite(value) ? value : min;
  };

  const handleSelectAnswer = value => {
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);
    setOtherValue('');

    // Auto-advance if not "Other" option
    if (value !== 'other') {
      setTimeout(() => {
        if (isLastQuestion) {
          onComplete(newAnswers);
        } else {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
      }, 300);
    }
  };

  const handleSliderChange = value => {
    const num = parseFloat(value);
    if (Number.isFinite(num)) {
      setAnswers({ ...answers, [currentQuestion.id]: num });
    }
  };

  const handleOtherSubmit = () => {
    if (otherValue.trim()) {
      const newAnswers = { ...answers, [currentQuestion.id]: otherValue.trim() };
      setAnswers(newAnswers);
      setOtherValue('');

      if (isLastQuestion) {
        onComplete(newAnswers);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    }
  };

  const handleNext = () => {
    let newAnswers = answers;

    if (currentQuestion.type === 'slider' && answers[currentQuestion.id] === undefined) {
      const initialValue = getInitialSliderValue(currentQuestion);
      newAnswers = { ...answers, [currentQuestion.id]: initialValue };
      setAnswers(newAnswers);
    }

    if (currentQuestion.type === 'input') {
      const value =
        answers[currentQuestion.id] !== undefined
          ? answers[currentQuestion.id]
          : currentQuestion.defaultValue ?? '';
      if (value === '' || value === undefined || value === null) {
        return;
      }
      newAnswers = { ...answers, [currentQuestion.id]: value };
      if (isLastQuestion) {
        onComplete(newAnswers);
      } else {
        setAnswers(newAnswers);
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
      return;
    }

    if (isLastQuestion) {
      onComplete(newAnswers);
    } else {
      setCurrentQuestionIndex(safeIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(safeIndex - 1);
      setOtherValue('');
    }
  };

  const handleSkip = () => {
    if (!allowSkip) return;
    if (isLastQuestion) {
      onComplete(answers);
    } else {
      setCurrentQuestionIndex(safeIndex + 1);
    }
  };

  const handleSkipAll = () => {
    if (!allowSkip) return;
    onSkipAll?.(answers);
  };

  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelDialog(false);
    onCancel();
  };

  const handleCancelDialogClose = () => {
    setShowCancelDialog(false);
  };

  const currentAnswer = answers[currentQuestion.id];
  const isOtherSelected = currentAnswer === 'other';
  const rawInputValue =
    currentAnswer !== undefined ? currentAnswer : currentQuestion.defaultValue ?? '';
  const inputValue =
    typeof rawInputValue === 'number' && !Number.isFinite(rawInputValue)
      ? ''
      : rawInputValue;

  return (
    <>
      {/* Modal Overlay */}
      <div className={css.overlay}>
        <div className={css.modal}>
          {/* Header */}
          <div className={css.header}>
            <div className={css.headerTop}>
              <h2 className={css.title}>
                <FormattedMessage id="QuestionModal.title" defaultMessage="Product Details" />
              </h2>
              <button
                type="button"
                onClick={handleCancelClick}
                className={css.closeButton}
                disabled={isRefining}
                aria-label={intl.formatMessage({ id: 'QuestionModal.closeLabel' })}
              >
                ×
              </button>
            </div>
            <div className={css.progressContainer}>
              <div className={css.progressBar}>
                <div className={css.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <span className={css.progressText}>
                <FormattedMessage
                  id="QuestionModal.progress"
                  defaultMessage="Question {current} of {total}"
                  values={{ current: currentQuestionIndex + 1, total: questions.length }}
                />
              </span>
            </div>
          </div>

          {/* Question Content */}
          <div className={css.content}>
            <h3 className={css.question}>{currentQuestion.question}</h3>
            {currentQuestion.subtitle && (
              <p className={css.subtitle}>{currentQuestion.subtitle}</p>
            )}

            {currentQuestion.type === 'select' && (
              <div className={css.selectOptions}>
                {currentQuestion.options?.map((option, index) => {
                  const optionValue =
                    typeof option === 'object' && option != null && 'value' in option
                      ? option.value
                      : option;
                  const optionLabel =
                    typeof option === 'object' && option != null && 'label' in option
                      ? option.label
                      : option;
                  return (
                    <button
                      key={optionValue != null ? String(optionValue) : `opt-${index}`}
                      type="button"
                      onClick={() => handleSelectAnswer(optionValue)}
                      className={`${css.optionButton} ${
                        currentAnswer === optionValue ? css.optionButtonSelected : ''
                      }`}
                      disabled={isRefining}
                    >
                      {optionLabel}
                    </button>
                  );
                })}

                {/* "Other" option */}
                <button
                  type="button"
                  onClick={() => handleSelectAnswer('other')}
                  className={`${css.optionButton} ${
                    isOtherSelected ? css.optionButtonSelected : ''
                  }`}
                  disabled={isRefining}
                >
                  <FormattedMessage id="QuestionModal.otherOption" defaultMessage="Other" />
                </button>

                {/* Other input field */}
                {isOtherSelected && (
                  <div className={css.otherContainer}>
                    <input
                      type="text"
                      value={otherValue}
                      onChange={e => setOtherValue(e.target.value)}
                      placeholder={intl.formatMessage({ id: 'QuestionModal.otherPlaceholder' })}
                      className={css.otherInput}
                      autoFocus
                      disabled={isRefining}
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          handleOtherSubmit();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleOtherSubmit}
                      className={css.otherSubmitButton}
                      disabled={!otherValue.trim() || isRefining}
                    >
                      <FormattedMessage id="QuestionModal.submitButton" defaultMessage="Submit" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentQuestion.type === 'slider' && (() => {
              const sliderOpts = getSliderOptions(currentQuestion);
              const displayValue =
                currentAnswer !== undefined
                  ? currentAnswer
                  : getInitialSliderValue(currentQuestion);
              const safeValue = Number.isFinite(displayValue) ? displayValue : sliderOpts.min;
              return (
                <div className={css.sliderContainer}>
                  <div className={css.sliderValue}>
                    <span className={css.sliderValueNumber}>{safeValue}</span>
                    {sliderOpts.unit && (
                      <span className={css.sliderValueUnit}>{sliderOpts.unit}</span>
                    )}
                  </div>
                  <input
                    type="range"
                    min={sliderOpts.min}
                    max={sliderOpts.max}
                    step={sliderOpts.step}
                    value={safeValue}
                    onChange={e => handleSliderChange(e.target.value)}
                    className={css.slider}
                    disabled={isRefining}
                  />
                  <div className={css.sliderLabels}>
                    <span>
                      {sliderOpts.min}
                      {sliderOpts.unit && ` ${sliderOpts.unit}`}
                    </span>
                    <span>
                      {sliderOpts.max}
                      {sliderOpts.unit && ` ${sliderOpts.unit}`}
                    </span>
                  </div>
                </div>
              );
            })()}

            {currentQuestion.type === 'input' && (
              <div className={css.inputContainer}>
                <div className={css.sliderValue}>
                  <span className={css.sliderValueNumber}>{inputValue}</span>
                  {currentQuestion.unit && (
                    <span className={css.sliderValueUnit}>{currentQuestion.unit}</span>
                  )}
                </div>
                <input
                  type="number"
                  value={inputValue}
                  onChange={e =>
                    setAnswers({ ...answers, [currentQuestion.id]: parseFloat(e.target.value) || e.target.value })
                  }
                  className={css.textInput}
                  disabled={isRefining}
                  step={currentQuestion.step ?? 1}
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className={css.footer}>
            <div className={css.footerLeft}>
              <button
                type="button"
                onClick={handlePrevious}
                disabled={isFirstQuestion || isRefining}
                className={css.marketplaceTextButton}
              >
                ← <FormattedMessage id="QuestionModal.previousButton" defaultMessage="Previous" />
              </button>
            </div>
            {allowSkip && (
              <div className={css.footerCenter}>
                <button
                  type="button"
                  onClick={handleSkip}
                  className={css.skipButton}
                  disabled={isRefining}
                >
                  <FormattedMessage id="QuestionModal.skipButton" defaultMessage="Skip" />
                </button>
                <button
                  type="button"
                  onClick={handleSkipAll}
                  className={css.skipAllButton}
                  disabled={isRefining}
                >
                  <FormattedMessage id="QuestionModal.skipAllButton" defaultMessage="Skip All" />
                </button>
              </div>
            )}
            <div className={css.footerRight}>
              {(currentQuestion.type === 'slider' || currentQuestion.type === 'input') && (
                <button
                  type="button"
                  onClick={handleNext}
                  className={css.primaryButton}
                  disabled={isRefining}
                >
                  {isLastQuestion ? (
                    <FormattedMessage id="QuestionModal.finishButton" defaultMessage="Finish" />
                  ) : (
                    <>
                      <FormattedMessage id="QuestionModal.nextButton" defaultMessage="Next" /> →
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isRefining && <LoadingOverlay titleId="QuestionModal.refiningMessage" />}

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className={css.dialogOverlay}>
          <div className={css.dialogBox}>
            <h3 className={css.dialogTitle}>
              <FormattedMessage
                id="QuestionModal.cancelDialogTitle"
                defaultMessage="Interrupt Listing Creation?"
              />
            </h3>
            <p className={css.dialogMessage}>
              <FormattedMessage
                id="QuestionModal.cancelDialogMessage"
                defaultMessage="If you continue, the listing creation process will be interrupted and you will return to the first step with your previously loaded images. All answers will be lost."
              />
            </p>
            <div className={css.dialogButtons}>
              <button
                type="button"
                onClick={handleCancelDialogClose}
                className={css.dialogSecondaryButton}
              >
                <FormattedMessage id="QuestionModal.cancelDialogStay" defaultMessage="Stay" />
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className={css.dialogPrimaryButton}
              >
                <FormattedMessage
                  id="QuestionModal.cancelDialogConfirm"
                  defaultMessage="Yes, Interrupt"
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuestionModal;
