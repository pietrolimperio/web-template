import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../util/reactIntl';

import { FieldBoolean } from '../../../components';

import FilterPlain from '../FilterPlain/FilterPlain';
import FilterPopup from '../FilterPopup/FilterPopup';

import css from './BooleanFilter.module.css';

const getBooleanQueryParam = queryParamNames => {
  return Array.isArray(queryParamNames)
    ? queryParamNames[0]
    : typeof queryParamNames === 'string'
    ? queryParamNames
    : null;
};

const normalizeBooleanValue = value => {
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return null;
};

const BooleanFilter = props => {
  const intl = useIntl();
  const {
    rootClassName,
    className,
    id,
    name,
    label,
    getAriaLabel,
    initialValues,
    contentPlacementOffset = 0,
    onSubmit,
    queryParamNames,
    showAsPopup = true,
    toggleOnly = false,
    ...rest
  } = props;

  const classes = classNames(rootClassName || css.root, className);
  const queryParamName = getBooleanQueryParam(queryParamNames);
  const rawInitialValue = normalizeBooleanValue(initialValues?.[queryParamName]);
  const hasInitialValues = typeof rawInitialValue === 'boolean';
  const isToggleSelected = rawInitialValue === true;
  const selectedValueLabel = hasInitialValues
    ? intl.formatMessage({ id: rawInitialValue ? 'FieldBoolean.yes' : 'FieldBoolean.no' })
    : '';

  const labelForPopup = hasInitialValues ? `${label}: ${selectedValueLabel}` : label;
  const namedInitialValues = { [name]: hasInitialValues ? rawInitialValue : '' };

  const handleSubmit = values => {
    const usedValue = values ? values[name] : null;
    onSubmit({
      [queryParamName]: typeof usedValue === 'boolean' ? usedValue : null,
    });
  };

  const handleToggle = () => {
    onSubmit({
      [queryParamName]: isToggleSelected ? null : true,
    });
  };

  if (toggleOnly) {
    return (
      <div className={classes}>
        <button
          type="button"
          className={classNames(css.toggleChip, { [css.toggleChipSelected]: isToggleSelected })}
          onClick={handleToggle}
          aria-label={label}
          aria-pressed={isToggleSelected}
        >
          <span
            className={classNames(css.toggleDot, { [css.toggleDotSelected]: isToggleSelected })}
          />
          {label}
        </button>
      </div>
    );
  }

  const field = (
    <FieldBoolean
      className={css.field}
      id={`${id}-boolean`}
      name={name}
      label={label}
      placeholder={intl.formatMessage({ id: 'CustomExtendedDataField.placeholderBoolean' })}
    />
  );

  return showAsPopup ? (
    <FilterPopup
      className={classes}
      rootClassName={rootClassName}
      popupClassName={css.popupSize}
      label={labelForPopup}
      ariaLabel={getAriaLabel(label, selectedValueLabel)}
      isSelected={hasInitialValues}
      id={`${id}.popup`}
      showAsPopup
      contentPlacementOffset={contentPlacementOffset}
      onSubmit={handleSubmit}
      initialValues={namedInitialValues}
      keepDirtyOnReinitialize
      {...rest}
    >
      {field}
    </FilterPopup>
  ) : (
    <FilterPlain
      className={className}
      rootClassName={rootClassName}
      label={label}
      labelSelection={selectedValueLabel}
      ariaLabel={getAriaLabel(label, selectedValueLabel)}
      isSelected={hasInitialValues}
      id={`${id}.plain`}
      liveEdit
      onSubmit={handleSubmit}
      initialValues={namedInitialValues}
      {...rest}
    >
      {field}
    </FilterPlain>
  );
};

export default BooleanFilter;
