# Issues

## "today" screen does not update to current day

App requires closing and opening for today to update to current day. This is a bit tricky because sometimes we want to treat an entry past midnight as the prev day. Example: 3am July 24th should be treated as July 23rd, not July 24th. What is a reasonable cutoff? probably 6 am. Let's have the "today" screen switch over to the next day at 6am. Also update all of the trends, totals, metrics, calendar view etc to reflect this. Total for a day goes from 6am - 6am. Also applies to days used for start/end of weeks.

## allow editing of usage entries

Right now editing requires deleting and then re-entering. Add the ability to edit both time and amount, as well as delete

## add ability to set default amount for a substance

Some substances are the same amount most of the time. Example Baclofen is almost always 10mg, but occassionaly more. In the substance configuration (both setup and editing), give the ability to set, edit a default amount. This amount will be auto-populated for an entry, but the amount can still be entered manually for an entry.
