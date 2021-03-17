import React from 'react';
import { useIntl } from 'react-intl';
import componentTypes from '@data-driven-forms/react-form-renderer/component-types';
import validatorTypes from '@data-driven-forms/react-form-renderer/validator-types';

import { Text, TextVariants } from '@patternfly/react-core/dist/esm/components/Text/Text';
import { TextContent } from '@patternfly/react-core/dist/esm/components/Text/TextContent';

import debouncePromise from '../../utilities/debouncePromise';
import { findSource } from '../../api/wizardHelpers';
import { schemaBuilder } from './schemaBuilder';
import { NO_APPLICATION_VALUE, wizardDescription, wizardTitle } from './stringConstants';
import configurationStep from './superKey/configurationStep';
import { compileAllApplicationComboOptions } from './compileAllApplicationComboOptions';
import applicationsStep from './superKey/applicationsStep';
import { REDHAT_VENDOR } from '../../utilities/constants';
import validated from '../../utilities/resolveProps/validated';
import handleError from '../../api/handleError';

export const asyncValidator = async (value, sourceId = undefined, intl) => {
  if (!value) {
    return undefined;
  }

  let response;
  try {
    response = await findSource(value);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(handleError(error));
    return undefined;
  }

  if (response.data.sources.find(({ id }) => id !== sourceId)) {
    throw intl.formatMessage({ defaultMessage: 'That name is taken. Try another.', id: 'wizard.nameTaken' });
  }

  return undefined;
};

let firstValidation = true;
export const setFirstValidated = (bool) => (firstValidation = bool);
export const getFirstValidated = () => firstValidation;

export const asyncValidatorDebounced = debouncePromise(asyncValidator);

export const asyncValidatorDebouncedWrapper = (intl) => {
  if (getFirstValidated()) {
    setFirstValidated(false);
    return (value, id) => (value ? asyncValidator(value, id, intl) : undefined);
  }

  return asyncValidatorDebounced;
};

export const compileAllSourcesComboOptions = (sourceTypes) => [
  ...sourceTypes
    .map((type) => ({
      ...type,
      product_name: type.vendor === 'Red Hat' ? type.product_name.replace('Red Hat ', '') : type.product_name,
    }))
    .sort((a, b) => a.product_name.localeCompare(b.product_name))
    .map((t) => ({
      value: t.name,
      label: t.product_name,
    })),
];

export const appMutatorRedHat = (appTypes) => (option, formOptions) => {
  const selectedSourceType = formOptions.getState().values.source_type;
  const appType = appTypes.find((app) => app.id === option.value);
  const isEnabled = selectedSourceType && appType ? appType.supported_source_types.includes(selectedSourceType) : true;

  if (!isEnabled) {
    return;
  }

  return option;
};

export const sourceTypeMutator = (appTypes, sourceTypes) => (option, formOptions) => {
  const selectedApp = formOptions.getState().values.application
    ? formOptions.getState().values.application.application_type_id
    : undefined;
  const appType = appTypes.find((app) => app.id === selectedApp);
  const isEnabled = appType
    ? appType.supported_source_types.includes(sourceTypes.find((type) => type.product_name === option.label).name)
    : true;
  return {
    ...option,
    isDisabled: !isEnabled,
  };
};

const shortIcons = {
  amazon: '/apps/frontend-assets/partners-icons/aws.svg',
  'ansible-tower': '/apps/frontend-assets/red-hat-logos/stacked.svg',
  azure: '/apps/frontend-assets/partners-icons/microsoft-azure-short.svg',
  openshift: '/apps/frontend-assets/red-hat-logos/stacked.svg',
  satellite: '/apps/frontend-assets/red-hat-logos/stacked.svg',
  google: '/apps/frontend-assets/partners-icons/google-cloud-short.svg',
};

export const iconMapper = (sourceTypes) => (name) => {
  const sourceType = sourceTypes.find((type) => type.name === name);

  if (!sourceType || (sourceType.icon_url && !shortIcons[name])) {
    return null;
  }

  const Icon = () => (
    <img
      src={shortIcons[name] || sourceType.icon_url}
      alt={sourceType.product_name}
      className={`ins-c-sources__wizard--icon ${sourceType.vendor === 'Red Hat' ? 'redhat-icon' : 'pf-u-mb-sm'}`}
    />
  );

  return Icon;
};

export const nextStep = (selectedType) => ({ values: { application, source_type } }) => {
  if (selectedType) {
    return 'application_step';
  }

  const appId = application && application.application_type_id !== NO_APPLICATION_VALUE && application.application_type_id;
  const resultedStep = appId ? `${source_type}-${appId}` : source_type;

  return resultedStep;
};

export const hasSuperKeyType = (sourceType) => sourceType?.schema.authentication.find(({ is_superkey }) => is_superkey);

export const nextStepCloud = (sourceTypes) => ({ values }) => {
  const sourceType = sourceTypes.find(({ name }) => name === values.source_type);

  return hasSuperKeyType(sourceType) ? 'configuration_step' : 'application_step';
};

const sourceTypeSelect = ({ intl, sourceTypes, applicationTypes }) => ({
  component: 'card-select',
  name: 'source_type',
  isRequired: true,
  label: intl.formatMessage({
    id: 'wizard.selectYourSourceType',
    defaultMessage: 'A. Select your source type',
  }),
  iconMapper: iconMapper(sourceTypes),
  validate: [
    {
      type: validatorTypes.REQUIRED,
    },
  ],
  options: compileAllSourcesComboOptions(sourceTypes, applicationTypes),
});

const redhatTypes = ({ intl, sourceTypes, applicationTypes, disableAppSelection }) => [
  sourceTypeSelect({ intl, sourceTypes, applicationTypes }),
  {
    component: 'enhanced-radio',
    name: 'application.application_type_id',
    label: intl.formatMessage({
      id: 'wizard.selectApplication',
      defaultMessage: 'B. Application',
    }),
    options: compileAllApplicationComboOptions(applicationTypes, intl, sourceTypes, REDHAT_VENDOR),
    mutator: appMutatorRedHat(applicationTypes),
    isDisabled: disableAppSelection,
    isRequired: true,
    validate: [{ type: validatorTypes.REQUIRED }],
    condition: { when: 'source_type', isNotEmpty: true },
  },
];

export const applicationStep = (applicationTypes, intl, activeVendor) => ({
  name: 'application_step',
  title: intl.formatMessage({
    id: 'wizard.selectApplication',
    defaultMessage: 'Select application',
  }),
  nextStep: nextStep(),
  fields: [
    {
      component: componentTypes.PLAIN_TEXT,
      name: 'app-description',
      label: intl.formatMessage({
        id: 'wizard.applicationDescription',
        defaultMessage:
          'Select an application to connect to your source. You can connect additional applications after source creation.',
      }),
    },
    {
      component: 'enhanced-radio',
      name: 'application.application_type_id',
      options: compileAllApplicationComboOptions(applicationTypes, intl, activeVendor),
      mutator: appMutatorRedHat(applicationTypes),
      menuIsPortal: true,
    },
    {
      component: componentTypes.TEXT_FIELD,
      name: 'source_type',
      hideField: true,
    },
  ],
});

export const typesStep = (sourceTypes, applicationTypes, disableAppSelection, intl) => ({
  title: intl.formatMessage({
    id: 'wizard.chooseAppAndType',
    defaultMessage: 'Source type and application',
  }),
  name: 'types_step',
  nextStep: 'name_step',
  fields: redhatTypes({ intl, sourceTypes, applicationTypes, disableAppSelection }),
});

export const cloudTypesStep = (sourceTypes, applicationTypes, intl) => ({
  title: intl.formatMessage({
    id: 'wizard.chooseAppAndType',
    defaultMessage: 'Select source type',
  }),
  name: 'types_step',
  nextStep: 'name_step',
  fields: [
    {
      component: componentTypes.PLAIN_TEXT,
      name: 'plain-text',
      label: intl.formatMessage({
        id: 'wizard.selectCloudType',
        defaultMessage: 'Select a cloud provider to connect to your Red Hat account.',
      }),
    },
    {
      ...sourceTypeSelect({ intl, sourceTypes, applicationTypes }),
      label: intl.formatMessage({
        id: 'wizard.selectCloudProvider',
        defaultMessage: 'Select a cloud provider',
      }),
    },
  ],
});

export const NameDescription = () => {
  const intl = useIntl();

  return (
    <TextContent key="step1">
      <Text component={TextVariants.p}>
        {intl.formatMessage({
          id: 'wizard.nameDescription',
          // eslint-disable-next-line max-len
          defaultMessage:
            'To import data for an application, you need to connect to a data source. Enter a name, then proceed to select your application and source type.',
        })}
      </Text>
    </TextContent>
  );
};

const nameStep = (intl, selectedType, sourceTypes, activeVendor) => ({
  title: intl.formatMessage({
    id: 'wizard.nameSource',
    defaultMessage: 'Name source',
  }),
  name: 'name_step',
  nextStep: activeVendor === REDHAT_VENDOR ? nextStep(selectedType) : nextStepCloud(sourceTypes),
  fields: [
    {
      component: 'description',
      name: 'description-summary',
      Content: NameDescription,
    },
    {
      component: componentTypes.TEXT_FIELD,
      name: 'source.name',
      type: 'text',
      label: intl.formatMessage({
        id: 'wizard.name',
        defaultMessage: 'Name',
      }),
      placeholder: 'Source_1',
      isRequired: true,
      validate: [(value) => asyncValidatorDebouncedWrapper(intl)(value, undefined, intl), { type: validatorTypes.REQUIRED }],
      resolveProps: validated,
    },
  ],
});

export const SummaryDescription = () => {
  const intl = useIntl();

  return (
    <TextContent>
      <Text component={TextVariants.p}>
        {intl.formatMessage(
          {
            id: 'wizard.summaryDescription',
            defaultMessage:
              'Review the information below and click <b>Add</b> to add your source. To edit details in previous steps, click <b>Back</b>.',
          },
          {
            // eslint-disable-next-line react/display-name
            b: (chunks) => <b key={`b-${chunks.length}-${Math.floor(Math.random() * 1000)}`}>{chunks}</b>,
          }
        )}
      </Text>
    </TextContent>
  );
};

const summaryStep = (sourceTypes, applicationTypes, intl) => ({
  fields: [
    {
      component: 'description',
      name: 'description-summary',
      Content: SummaryDescription,
    },
    {
      name: 'summary',
      component: 'summary',
      sourceTypes,
      applicationTypes,
    },
  ],
  name: 'summary',
  title: intl.formatMessage({
    id: 'wizard.reviewDetails',
    defaultMessage: 'Review details',
  }),
});

export default (
  sourceTypes,
  applicationTypes,
  disableAppSelection,
  container,
  intl,
  selectedType,
  initialWizardState,
  activeVendor
) => {
  setFirstValidated(true);

  return {
    fields: [
      {
        component: componentTypes.WIZARD,
        name: 'wizard',
        className: 'sources',
        title: wizardTitle(activeVendor),
        inModal: true,
        description: wizardDescription(activeVendor),
        buttonLabels: {
          submit: intl.formatMessage({
            id: 'sources.add',
            defaultMessage: 'Add',
          }),
          back: intl.formatMessage({
            id: 'wizard.back',
            defaultMessage: 'Back',
          }),
          cancel: intl.formatMessage({
            id: 'wizard.cancel',
            defaultMessage: 'Cancel',
          }),
          next: intl.formatMessage({
            id: 'wizard.next',
            defaultMessage: 'Next',
          }),
        },
        container,
        showTitles: true,
        initialState: initialWizardState,
        crossroads: ['application.application_type_id', 'source_type', 'auth_select', 'source.app_creation_workflow'],
        fields: [
          ...(!selectedType
            ? activeVendor === REDHAT_VENDOR
              ? [typesStep(sourceTypes, applicationTypes, disableAppSelection, intl)]
              : [cloudTypesStep(sourceTypes, applicationTypes, intl)]
            : []),
          nameStep(intl, selectedType, sourceTypes, activeVendor),
          configurationStep(intl, sourceTypes),
          applicationsStep(applicationTypes, intl),
          applicationStep(applicationTypes, intl, activeVendor),
          ...schemaBuilder(sourceTypes, applicationTypes),
          summaryStep(sourceTypes, applicationTypes, intl),
        ],
      },
    ],
  };
};
