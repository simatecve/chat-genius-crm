-- Enable realtime for campaign_sends table
ALTER TABLE campaign_sends REPLICA IDENTITY FULL;