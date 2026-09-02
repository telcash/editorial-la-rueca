'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FieldError } from '@/features/admin/components/forms/field-error';
import { FormSection } from '@/features/admin/components/forms/form-section';
import {
  bookSalesProductStatusLabels,
  bookSalesProductStatusValues,
  type BookSalesProductStatus,
} from '@/services/sales/sales-product-status';
import type { BookSalesAdminConfiguration } from '@/services/sales/sales.types';
import { updateBookSalesAction } from '../actions/update-book-sales';
import {
  getBookSalesFormErrors,
  mapBookSalesConfigurationToFormValues,
  toggleBookSalesMarket,
} from '../lib/book-sales-form.helpers';
import type { BookSalesActionState, BookSalesFormValues } from '../types/book-sales-form-state';

interface BookSalesFormProps {
  bookId: string;
  configuration: BookSalesAdminConfiguration;
}

function StatusField({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: BookSalesProductStatus;
  disabled: boolean;
  onChange: (value: BookSalesProductStatus) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Estado</Label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as BookSalesProductStatus)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {bookSalesProductStatusValues.map((status) => (
          <option key={status} value={status}>
            {bookSalesProductStatusLabels[status]}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChannelSwitch({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function BookSalesForm({ bookId, configuration }: BookSalesFormProps) {
  const initialValues = useMemo(
    () => mapBookSalesConfigurationToFormValues(configuration),
    [configuration],
  );
  const [values, setValues] = useState<BookSalesFormValues>(initialValues);
  const [savedValues, setSavedValues] = useState<BookSalesFormValues>(initialValues);
  const [state, setState] = useState<BookSalesActionState | null>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const isDirty = JSON.stringify(values) !== JSON.stringify(savedValues);
  const fieldErrors = { ...clientErrors, ...state?.fieldErrors };

  function updateQuares(valuesToUpdate: Partial<BookSalesFormValues['quares']>) {
    setState(null);
    setValues((currentValues) => ({
      ...currentValues,
      quares: { ...currentValues.quares, ...valuesToUpdate },
    }));
  }

  function updateAmazon(valuesToUpdate: Partial<BookSalesFormValues['amazon']>) {
    setState(null);
    setValues((currentValues) => ({
      ...currentValues,
      amazon: { ...currentValues.amazon, ...valuesToUpdate },
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = getBookSalesFormErrors(values);

    setClientErrors(validationErrors);
    setState(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    startTransition(async () => {
      const result = await updateBookSalesAction(bookId, values);
      setState(result);

      if (result.success) {
        setSavedValues(values);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardContent className="pt-6">
          <FormSection
            title="Venta y distribución"
            description="Configura la disponibilidad comercial de este libro por canal."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <fieldset className="space-y-4 rounded-md border border-border p-4">
                <legend className="px-1 text-base font-semibold">Quares</legend>
                <ChannelSwitch
                  id="quares-enabled"
                  label="Disponible en Quares"
                  description="Conservaremos la configuración si desactivas el canal."
                  checked={values.quares.enabled}
                  disabled={isPending}
                  onCheckedChange={(enabled) => updateQuares({ enabled })}
                />

                {values.quares.enabled ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="quares-external-product-id">ID Quares</Label>
                        <Input
                          id="quares-external-product-id"
                          value={values.quares.externalProductId}
                          disabled={isPending}
                          onChange={(event) =>
                            updateQuares({ externalProductId: event.target.value })
                          }
                          aria-invalid={Boolean(fieldErrors['quares.externalProductId'])}
                          aria-describedby="quares-external-product-id-error"
                          inputMode="text"
                          placeholder="67778"
                        />
                        <div id="quares-external-product-id-error">
                          <FieldError message={fieldErrors['quares.externalProductId']} />
                        </div>
                      </div>
                      <StatusField
                        id="quares-status"
                        value={values.quares.status}
                        disabled={isPending}
                        onChange={(status) => updateQuares({ status })}
                      />
                    </div>

                    <fieldset className="space-y-3">
                      <legend className="text-sm font-medium">Disponible en</legend>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                        {configuration.quares.markets.map((market) => {
                          const checked = values.quares.marketIds.includes(market.id);
                          const disabled = isPending || (!market.isActive && !checked);

                          return (
                            <label
                              key={market.id}
                              className="flex min-h-10 items-center gap-3 rounded-md border border-border px-3 py-2 text-sm has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:disabled]:opacity-50"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={() =>
                                  updateQuares({
                                    marketIds: toggleBookSalesMarket(
                                      values.quares.marketIds,
                                      market.id,
                                    ),
                                  })
                                }
                                className="size-4 accent-primary"
                              />
                              <span>
                                {market.name}
                                {!market.isActive ? ' (inactivo)' : ''}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <FieldError message={fieldErrors['quares.marketIds']} />
                    </fieldset>
                  </div>
                ) : null}
              </fieldset>

              <fieldset className="space-y-4 rounded-md border border-border p-4">
                <legend className="px-1 text-base font-semibold">Amazon</legend>
                <ChannelSwitch
                  id="amazon-enabled"
                  label="Registrar canal Amazon"
                  description="La URL y el estado se conservarán al desactivar el canal."
                  checked={values.amazon.enabled}
                  disabled={isPending}
                  onCheckedChange={(enabled) => updateAmazon({ enabled })}
                />

                {values.amazon.enabled ? (
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amazon-purchase-url">URL de compra</Label>
                      <Input
                        id="amazon-purchase-url"
                        type="url"
                        value={values.amazon.purchaseUrl}
                        disabled={isPending}
                        onChange={(event) => updateAmazon({ purchaseUrl: event.target.value })}
                        aria-invalid={Boolean(fieldErrors['amazon.purchaseUrl'])}
                        aria-describedby="amazon-purchase-url-error"
                        placeholder="https://www.amazon.es/dp/..."
                      />
                      <div id="amazon-purchase-url-error">
                        <FieldError message={fieldErrors['amazon.purchaseUrl']} />
                      </div>
                    </div>
                    <StatusField
                      id="amazon-status"
                      value={values.amazon.status}
                      disabled={isPending}
                      onChange={(status) => updateAmazon({ status })}
                    />
                  </div>
                ) : null}
              </fieldset>
            </div>

            {state?.formError ? (
              <p role="alert" className="text-sm text-destructive">
                {state.formError}
              </p>
            ) : null}
            {state?.success ? (
              <p role="status" className="text-sm font-medium text-emerald-700">
                Configuración comercial guardada correctamente.
              </p>
            ) : null}
          </FormSection>
        </CardContent>
        <CardFooter className="flex justify-end border-t border-border">
          <Button type="submit" disabled={isPending || !isDirty}>
            {isPending ? 'Guardando…' : 'Guardar venta y distribución'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
