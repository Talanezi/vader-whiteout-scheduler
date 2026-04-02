import Form from 'react-bootstrap/Form';

export default function MeetingLocationPrompt({
  meetingLocation,
  setMeetingLocation,
}: {
  meetingLocation: string;
  setMeetingLocation: (value: string) => void;
}) {
  return (
    <Form.Group className="create-meeting-form-group">
      <Form.Label className="create-meeting-question">
        Where is this block happening?
      </Form.Label>
      <Form.Control
        placeholder="Rehearsal room, beach location, studio, Geisel lawn, Zoom, TBA..."
        className="form-text-input"
        value={meetingLocation}
        onChange={(ev) => setMeetingLocation(ev.target.value)}
      />
    </Form.Group>
  );
}
