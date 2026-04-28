import React from 'react';
import { Field } from 'react-final-form';
import classNames from 'classnames';

import {
  CATEGORY_MULTI_FILTER_PARAM,
  buildCategorySelectionToken,
  formatCategoryMultiFilter,
  getCategorySelectionsFromLegacyParams,
  parseCategoryMultiFilter,
} from '../../../util/search';

import FilterPlain from '../FilterPlain/FilterPlain';
import FilterPopup from '../FilterPopup/FilterPopup';

import css from './CategoryMultiSelectFilter.module.css';

const hasSelectedDescendant = (option, selectedValues) => {
  const suboptions = option?.suboptions || [];
  return suboptions.some(suboption => {
    const token = buildCategorySelectionToken(suboption.levelKey, suboption.option);
    return selectedValues.includes(token) || hasSelectedDescendant(suboption, selectedValues);
  });
};

const getSelectedLabels = (options, selectedValues) =>
  options.reduce((picked, option) => {
    const token = buildCategorySelectionToken(option.levelKey, option.option);
    const currentLabel = selectedValues.includes(token) ? [option.label] : [];
    const childLabels = option.suboptions?.length
      ? getSelectedLabels(option.suboptions, selectedValues)
      : [];
    return [...picked, ...currentLabel, ...childLabels];
  }, []);

const getDescendantTokens = option =>
  (option?.suboptions || []).reduce((picked, suboption) => {
    const token = buildCategorySelectionToken(suboption.levelKey, suboption.option);
    const nestedTokens = getDescendantTokens(suboption);
    return token ? [...picked, token, ...nestedTokens] : [...picked, ...nestedTokens];
  }, []);

const TreeOption = props => {
  const { option, selectedValues, onToggle, availableTokenSet, ancestors = [] } = props;
  const token = buildCategorySelectionToken(option.levelKey, option.option);
  const isSelected = selectedValues.includes(token);
  const availabilityKnown = !!availableTokenSet;
  const isAvailable = !availabilityKnown || availableTokenSet.has(token);
  const isDisabled = !isSelected && !isAvailable;
  const shouldShowChildren = isSelected || hasSelectedDescendant(option, selectedValues);
  const optionName = [...ancestors, option.label].join(' / ');
  const handleClick = event => {
    onToggle(option, token, !isSelected);

    if (isSelected && typeof event?.currentTarget?.blur === 'function') {
      event.currentTarget.blur();
    }
  };

  return (
    <li className={css.optionItem}>
      <button
        type="button"
        className={classNames(css.optionChip, {
          [css.optionChipSelected]: isSelected,
          [css.optionChipParentSelected]: shouldShowChildren && !isSelected,
          [css.optionChipDisabled]: isDisabled,
        })}
        aria-label={optionName}
        aria-pressed={isSelected}
        disabled={isDisabled}
        onClick={handleClick}
      >
        <span className={css.optionText}>{option.label}</span>
      </button>

      {option.suboptions?.length && shouldShowChildren ? (
        <div className={css.suboptionsPanel} aria-label={optionName}>
          <div className={css.suboptionsHeader}>{option.label}</div>
          <ul className={css.suboptions}>
            {option.suboptions.map(suboption => (
              <TreeOption
                key={buildCategorySelectionToken(suboption.levelKey, suboption.option)}
                option={suboption}
                selectedValues={selectedValues}
                onToggle={onToggle}
                availableTokenSet={availableTokenSet}
                ancestors={[...ancestors, option.label]}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
};

const FieldCategoryTreeMulti = props => {
  const { className, rootClassName, name, options, availableTokens } = props;
  const classes = classNames(rootClassName || css.root, className);
  const availableTokenSet = Array.isArray(availableTokens) ? new Set(availableTokens) : null;

  return (
    <Field name={name}>
      {fieldProps => {
        const { value = [], onChange } = fieldProps.input;
        const selectedValues = Array.isArray(value) ? value : [];
        const handleToggle = (option, token, isChecked) => {
          const descendantTokens = getDescendantTokens(option);
          const nextValues = isChecked
            ? [...selectedValues, token]
            : selectedValues.filter(
                currentValue => currentValue !== token && !descendantTokens.includes(currentValue)
              );
          onChange(nextValues);
        };

        return (
          <div className={classes}>
            <ul className={css.optionList}>
              {options.map(option => (
                <TreeOption
                  key={buildCategorySelectionToken(option.levelKey, option.option)}
                  option={option}
                  selectedValues={selectedValues}
                  onToggle={handleToggle}
                  availableTokenSet={availableTokenSet}
                />
              ))}
            </ul>
          </div>
        );
      }}
    </Field>
  );
};

const CategoryMultiSelectFilter = props => {
  const {
    rootClassName,
    className,
    id,
    name,
    label,
    getAriaLabel,
    options,
    initialValues,
    contentPlacementOffset = 0,
    onSubmit,
    showAsPopup,
    legacyQueryParamNames = [],
    availableTokens,
    ...rest
  } = props;

  const classes = classNames(rootClassName || css.root, className);

  const selectedOptions = initialValues?.[CATEGORY_MULTI_FILTER_PARAM]
    ? parseCategoryMultiFilter(initialValues[CATEGORY_MULTI_FILTER_PARAM])
    : getCategorySelectionsFromLegacyParams(initialValues, legacyQueryParamNames);
  const hasInitialValues = selectedOptions.length > 0;
  const selectedLabels = getSelectedLabels(options, selectedOptions);
  const namedInitialValues = { [name]: selectedOptions };
  const labelSelectionForPlain = hasInitialValues ? `${selectedOptions.length}` : '';

  const handleSubmit = values => {
    const selectedValues = Array.isArray(values?.[name]) ? values[name] : [];
    const legacyParamsToClear = legacyQueryParamNames.reduce(
      (picked, queryParamName) => ({ ...picked, [queryParamName]: null }),
      {}
    );

    onSubmit({
      [CATEGORY_MULTI_FILTER_PARAM]: formatCategoryMultiFilter(selectedValues),
      ...legacyParamsToClear,
      page: null,
    });
  };

  return showAsPopup ? (
    <FilterPopup
      className={classes}
      rootClassName={rootClassName}
      popupClassName={css.popupSize}
      label={label}
      ariaLabel={getAriaLabel(label, selectedLabels.join(', '))}
      isSelected={hasInitialValues}
      id={`${id}.popup`}
      showAsPopup
      contentPlacementOffset={contentPlacementOffset}
      onSubmit={handleSubmit}
      initialValues={namedInitialValues}
      keepDirtyOnReinitialize
      {...rest}
    >
      <FieldCategoryTreeMulti name={name} options={options} availableTokens={availableTokens} />
    </FilterPopup>
  ) : (
    <FilterPlain
      className={className}
      rootClassName={rootClassName}
      label={label}
      labelSelection={labelSelectionForPlain}
      ariaLabel={getAriaLabel(label, selectedLabels.join(', '))}
      isSelected={hasInitialValues}
      id={`${id}.plain`}
      liveEdit
      initiallyOpen={hasInitialValues}
      onSubmit={handleSubmit}
      initialValues={namedInitialValues}
      {...rest}
    >
      <FieldCategoryTreeMulti name={name} options={options} availableTokens={availableTokens} />
    </FilterPlain>
  );
};

export default CategoryMultiSelectFilter;
