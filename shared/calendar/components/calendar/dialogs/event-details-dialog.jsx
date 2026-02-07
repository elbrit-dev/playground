"use client";;
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@calendar/components/ui/button";
import { TAG_FORM_CONFIG } from "@calendar/lib/calendar/form-config";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@calendar/components/ui/dialog";
import { ScrollArea } from "@calendar/components/ui/scroll-area";
import { useCalendar } from "@calendar/components/calendar/contexts/calendar-context";
import { AddEditEventDialog } from "@calendar/components/calendar/dialogs/add-edit-event-dialog";
import { deleteEventFromErp } from "@calendar/services/event.service";
import { EventDetailsFields } from "@calendar/components/calendar/dialogs/EventDetailsFields";
export function EventDetailsDialog({
	event,
	children
}) {
	const [open, setOpen] = useState(false);
	const { use24HourFormat, removeEvent, employeeOptions, doctorOptions } = useCalendar();
	const deleteLockRef = useRef(false);
	const tagConfig =
		TAG_FORM_CONFIG[event.tags] ?? TAG_FORM_CONFIG.DEFAULT;

	const canDelete =
		tagConfig.ui?.allowDelete?.(event) ?? true;
	const canEdit =
		tagConfig.ui?.allowEdit?.(event) ?? true;
		const editAction = tagConfig.ui?.primaryEditAction;
		const eventWithOptions = {
			...event,
			_employeeOptions: employeeOptions,
			_doctorOptions: doctorOptions,
		  };
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild onClick={() => setOpen(true)}>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{event.title}</DialogTitle>
				</DialogHeader>

				<ScrollArea className="max-h-[80vh]">
					<div className="p-4">
						<EventDetailsFields
							event={eventWithOptions}
							config={tagConfig}
							use24HourFormat={use24HourFormat}
						/>
					</div>
				</ScrollArea>
				<div className="flex justify-end gap-2">
					{canEdit && (
						<AddEditEventDialog
							event={event}
							forceValues={editAction?.setOnEdit}
						>
							<Button variant="outline">
								{editAction?.label ?? "Edit"}
							</Button>
						</AddEditEventDialog>
					)}
					{canDelete && (
						<Button
							variant="destructive"
							onClick={async () => {
								if (deleteLockRef.current) return;
								deleteLockRef.current = true;

								try {
									await deleteEventFromErp(event.erpName);
									removeEvent(event.erpName);
									setOpen(false);
									toast.success("Event deleted successfully.");
								} catch (e) {
									toast.error("Error deleting event.");
								} finally {
									deleteLockRef.current = false;
								}
							}}
						>
							Delete
						</Button>
					)}
				</div>

			</DialogContent>
		</Dialog>
	);
}
