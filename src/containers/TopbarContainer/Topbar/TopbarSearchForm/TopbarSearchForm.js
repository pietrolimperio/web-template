import React, { useEffect, useRef, useState } from 'react';
import { Form as FinalForm, Field } from 'react-final-form';
import classNames from 'classnames';

import { useIntl } from '../../../../util/reactIntl';
import { isMainSearchTypeKeywords } from '../../../../util/search';
import { parseDateFromISO8601, stringifyDateToISO8601 } from '../../../../util/dates';

import {
  FieldDateRangeController,
  Form,
  LocationAutocompleteInput,
  OutsideClickHandler,
} from '../../../../components';

import IconSearchDesktop from './IconSearchDesktop';
import css from './TopbarSearchForm.module.css';

const identity = v => v;

const formatDateRangeLabel = (datesParam, intl) => {
  if (!datesParam || typeof datesParam !== 'string') {
    return null;
  }
  const [startRaw, endRaw] = datesParam.split(',');
  if (!startRaw || !endRaw) {
    return null;
  }

  const start = new Date(`${startRaw}T00:00:00`);
  const end = new Date(`${endRaw}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const startDay = intl.formatDate(start, { day: 'numeric' });
  const endDay = intl.formatDate(end, { day: 'numeric' });
  const month = intl.formatDate(end, { month: 'short' });

  return `${startDay} - ${endDay} ${month}`;
};

const formatSelectedDateRange = (datesValue, intl) => {
  const startDate = datesValue?.startDate;
  const endDate = datesValue?.endDate;

  if (!startDate || !endDate) {
    return null;
  }

  return formatDateRangeLabel(
    `${stringifyDateToISO8601(startDate)},${stringifyDateToISO8601(endDate)}`,
    intl
  );
};

const parseInitialDates = datesParam => {
  if (!datesParam || typeof datesParam !== 'string') {
    return null;
  }

  const [startRaw, endRaw] = datesParam.split(',');
  const startDate = startRaw ? parseDateFromISO8601(startRaw) : null;
  const endDate = endRaw ? parseDateFromISO8601(endRaw) : null;

  return startDate && endDate ? { startDate, endDate } : null;
};

const KeywordSearchField = props => {
  const {
    keywordSearchWrapperClasses,
    stitchSearchShellClassName,
    datePickerPopupClassName,
    intl,
    isMobile = false,
    inputRef,
    currentDates,
    onDateRangeChange,
    minimumNights = 0,
    testIdPrefix = 'topbar',
    inputIdPrefix = 'keyword-search',
  } = props;
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const dateRangeLabel = formatSelectedDateRange(currentDates, intl);

  useEffect(() => {
    if (FieldDateRangeController.preload) {
      FieldDateRangeController.preload();
    }
  }, []);

  if (!isMobile) {
    return (
      <OutsideClickHandler
        className={classNames(keywordSearchWrapperClasses, css.desktopKeywordField)}
        onOutsideClick={() => setIsDatePickerOpen(false)}
      >
        <div className={classNames(css.stitchSearchShell, stitchSearchShellClassName)}>
          <div className={css.searchSection}>
            <span className={css.sectionLabel}>Cosa</span>
            <Field
              name="keywords"
              render={({ input, meta }) => {
                return (
                  <input
                    className={css.stitchDesktopInput}
                    {...input}
                    id={`${inputIdPrefix}`}
                    data-testid={`${testIdPrefix}-keyword-search`}
                    ref={inputRef}
                    type="text"
                    placeholder={intl.formatMessage({
                      id: 'TopbarSearchForm.placeholder',
                    })}
                    autoComplete="off"
                  />
                );
              }}
            />
          </div>
          <div className={css.sectionDivider} />
          <button
            type="button"
            className={classNames(css.searchSection, css.dateSectionButton, {
              [css.dateSectionButtonOpen]: isDatePickerOpen,
            })}
            onClick={() => setIsDatePickerOpen(prevState => !prevState)}
            aria-expanded={isDatePickerOpen}
            aria-haspopup="dialog"
            data-testid={`${testIdPrefix}-date-trigger`}
          >
            <span className={css.sectionLabel}>Quando</span>
            <span
              className={classNames(css.dateRangeValue, {
                [css.dateRangeValuePlaceholder]: !dateRangeLabel,
              })}
            >
              {dateRangeLabel || 'Periodo non selezionato'}
            </span>
          </button>
          <button
            className={css.searchSubmitStitch}
            aria-label={intl.formatMessage({ id: 'TopbarDesktop.screenreader.search' })}
          >
            <IconSearchDesktop />
          </button>
        </div>
        {isDatePickerOpen ? (
          <div
            className={classNames(css.datePickerPopup, datePickerPopupClassName)}
            data-testid={`${testIdPrefix}-date-picker`}
          >
            <FieldDateRangeController
              name="dates"
              minimumNights={minimumNights}
              hasFocusOnMount
              onChange={value => {
                onDateRangeChange(value);
                const hasFullRange = value?.startDate && value?.endDate;
                const isCleared = !value;

                if (hasFullRange || isCleared) {
                  setIsDatePickerOpen(false);
                }
              }}
            />
          </div>
        ) : null}
      </OutsideClickHandler>
    );
  }

  return (
    <div className={keywordSearchWrapperClasses}>
      <button
        className={css.searchSubmit}
        aria-label={intl.formatMessage({ id: 'TopbarDesktop.screenreader.search' })}
      >
        <div className={css.mobileIcon}>
          <IconSearchDesktop />
        </div>
      </button>
      <Field
        name="keywords"
        render={({ input, meta }) => {
          return (
            <input
              className={isMobile ? css.mobileInput : css.desktopInput}
              {...input}
              id={isMobile ? 'keyword-search-mobile' : 'keyword-search'}
              data-testid={isMobile ? 'keyword-search-mobile' : 'keyword-search'}
              ref={inputRef}
              type="text"
              placeholder={intl.formatMessage({
                id: 'TopbarSearchForm.placeholder',
              })}
              autoComplete="off"
            />
          );
        }}
      />
    </div>
  );
};

const LocationSearchField = props => {
  const { desktopInputRootClass, intl, isMobile = false, inputRef, onLocationChange } = props;
  const submitButton = ({}) => (
    <button
      className={css.searchSubmit}
      aria-label={intl.formatMessage({ id: 'TopbarDesktop.screenreader.search' })}
    >
      <IconSearchDesktop />
    </button>
  );
  return (
    <Field
      name="location"
      format={identity}
      render={({ input, meta }) => {
        const { onChange, ...restInput } = input;

        // Merge the standard onChange function with custom behaviur. A better solution would
        // be to use the FormSpy component from Final Form and pass onChange to the
        // onChange prop but that breaks due to insufficient subscription handling.
        // See: https://github.com/final-form/react-final-form/issues/159
        const searchOnChange = value => {
          onChange(value);
          onLocationChange(value);
        };

        return (
          <LocationAutocompleteInput
            className={isMobile ? css.mobileInputRoot : desktopInputRootClass}
            iconClassName={isMobile ? css.mobileIcon : css.desktopIcon}
            inputClassName={isMobile ? css.mobileInput : css.desktopInput}
            predictionsClassName={isMobile ? css.mobilePredictions : css.desktopPredictions}
            predictionsAttributionClassName={isMobile ? css.mobilePredictionsAttribution : null}
            placeholder={intl.formatMessage({ id: 'TopbarSearchForm.placeholder' })}
            closeOnBlur={!isMobile}
            inputRef={inputRef}
            input={{ ...restInput, onChange: searchOnChange }}
            meta={meta}
            submitButton={submitButton}
            ariaLabel={intl.formatMessage({ id: 'TopbarDesktop.screenreader.search' })}
          />
        );
      }}
    />
  );
};

/**
 * The main search form for the Topbar.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.desktopInputRoot root class for desktop form input
 * @param {Function} props.onSubmit
 * @param {boolean} props.isMobile
 * @param {Object} props.appConfig
 * @returns {JSX.Element} search form element
 */
const TopbarSearchForm = props => {
  const searchInpuRef = useRef(null);
  const intl = useIntl();
  const {
    appConfig,
    onSubmit,
    selectedDates,
    initialValues = {},
    keywordSearchWrapperClassName,
    stitchSearchShellClassName,
    datePickerPopupClassName,
    testIdPrefix = 'topbar',
    inputIdPrefix,
    ...restOfProps
  } = props;

  const onChange = location => {
    if (!isMainSearchTypeKeywords(appConfig) && location.selectedPlace) {
      // Note that we use `onSubmit` instead of the conventional
      // `handleSubmit` prop for submitting. We want to autosubmit
      // when a place is selected, and don't require any extra
      // validations for the form.
      onSubmit({ location });
      // blur search input to hide software keyboard
      searchInpuRef?.current?.blur();
    }
  };

  const onKeywordSubmit = values => {
    if (isMainSearchTypeKeywords(appConfig)) {
      onSubmit({ keywords: values.keywords, dates: values?.dates || null });
      // blur search input to hide software keyboard
      searchInpuRef?.current?.blur();
    }
  };

  const onLocationSubmit = values => {
    // Allow submit button click for an empty location search form
    if (!isMainSearchTypeKeywords(appConfig)) {
      onSubmit({ location: values.location, dates: values?.dates || null });
    }
  };

  const isKeywordsSearch = isMainSearchTypeKeywords(appConfig);
  const submit = isKeywordsSearch ? onKeywordSubmit : onLocationSubmit;
  const datesFilter = appConfig.search.defaultFilters.find(f => f.key === 'dates');
  const isNightlyMode = datesFilter?.dateRangeMode === 'night';
  const mergedInitialValues = {
    ...initialValues,
    dates: parseInitialDates(selectedDates),
  };
  return (
    <FinalForm
      {...restOfProps}
      initialValues={mergedInitialValues}
      onSubmit={submit}
      render={formRenderProps => {
        const {
          rootClassName,
          className,
          desktopInputRoot,
          isMobile = false,
          handleSubmit,
          form,
          values,
        } = formRenderProps;
        const classes = classNames(rootClassName, className);
        const desktopInputRootClass = desktopInputRoot || css.desktopInputRoot;

        const keywordSearchWrapperClasses = classNames(
          css.keywordSearchWrapper,
          isMobile ? css.mobileInputRoot : desktopInputRootClass,
          keywordSearchWrapperClassName
        );

        return (
          <Form className={classes} onSubmit={handleSubmit} enforcePagePreloadFor="SearchPage">
            {isKeywordsSearch ? (
              <KeywordSearchField
                keywordSearchWrapperClasses={keywordSearchWrapperClasses}
                intl={intl}
                isMobile={isMobile}
                inputRef={searchInpuRef}
                currentDates={values?.dates}
                minimumNights={isNightlyMode ? 1 : 0}
                stitchSearchShellClassName={stitchSearchShellClassName}
                datePickerPopupClassName={datePickerPopupClassName}
                testIdPrefix={testIdPrefix}
                inputIdPrefix={inputIdPrefix || `${testIdPrefix}-keyword-search`}
                onDateRangeChange={value => {
                  const hasFullRange = value?.startDate && value?.endDate;
                  const isCleared = !value;

                  form.change('dates', value);

                  if (hasFullRange || isCleared) {
                    form.submit();
                  }
                }}
              />
            ) : (
              <LocationSearchField
                desktopInputRootClass={desktopInputRootClass}
                intl={intl}
                isMobile={isMobile}
                inputRef={searchInpuRef}
                onLocationChange={onChange}
              />
            )}
          </Form>
        );
      }}
    />
  );
};

export default TopbarSearchForm;
