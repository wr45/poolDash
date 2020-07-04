﻿(function ($) {
    $.widget("pic.chemistry", {
        options: { },
        _create: function () {
            var self = this, o = self.options, el = self.element;
            el[0].initChemistry = function(data) { self._initChemistry(data); };
        },
        _initChemistry: function(data) {
            var self = this, o = self.options, el = self.element;
            el.empty();
            let div = $('<div class="picCircuitTitle"></div>');
            div.appendTo(el);
            let span = $('<span class="picCircuitTitle"></span>');
            span.appendTo(div);
            span.text('Chemistry');
            for (let i = 0; i < data.chlorinators.length; i++) {
                let div = $('<div class="picChlorinator"></div>');
                div.appendTo(el);
                div.chlorinator(data.chlorinators[i]);
            }
            for (let i = 0; i < data.chemControllers.length; i++) {
                $('<div class="picChemController"></div>').appendTo(el).chemController(data.chemControllers[i]);
            }
        }
    });
    $.widget('pic.chlorinator', {
        options: {},
        _create: function () {
            var self = this, o = self.options, el = self.element;
            self._buildControls();
            el[0].setEquipmentData = function (data) { self.setEquipmentData(data); };
        },
        setEquipmentData: function (data) {
            var self = this, o = self.options, el = self.element;
            try {
                el.attr('data-saltrequired', data.saltRequired);
                if (!data.isActive === false) el.hide();
                else el.show();
                //data.state = data.currentOutput > 0 ? 'on' : 'off';
                el.find('div.picChlorinatorState').attr('data-status', data.currentOutput > 0 ? 'on' : 'off');
                dataBinder.bind(el, data);
                let sc = el.find('div.picSuperChlor');
                if (data.superChlor) {
                    sc.show();
                    if (o.superChlorTimer) clearTimeout(o.superChlorTimer);
                    if (data.superChlorRemaining > 0) {
                        o.superChlorTimer = setInterval(function () { self.countdownSuperChlor(); }, 1000);
                        el.find('div.picSuperChlorBtn label.picSuperChlor').text('Cancel Chlorinate');
                        el.find('div.picSuperChlorBtn div.picIndicator').attr('data-status', 'on');
                    }
                }
                else {
                    if (o.superChlorTimer) clearTimeout(o.superChlorTimer);
                    o.superChlorTimer = null;
                    sc.hide();
                    el.find('div.picSuperChlorBtn label.picSuperChlor').text('Super Chlorinate');
                    el.find('div.picSuperChlorBtn div.picIndicator').attr('data-status', 'off');
                }
                if (typeof data.status !== 'object' || data.status.val === 128) el.find('div.picSuperChlorBtn').hide();
                else el.find('div.picSuperChlorBtn').show();
                el.data('remaining', data.superChlorRemaining);
                el.attr('data-status', data.status.name);
            }
            catch (err) { console.log({ m: 'Error setting chlorinator data', err: err, chlor: data }); }
        },
        countdownSuperChlor: function () {
            var self = this, o = self.options, el = self.element;
            let rem = Math.max(el.data('remaining') - 1);
            el.find('span.picSuperChlorRemaining').each(function () {
                $(this).text(dataBinder.formatDuration(rem));
            });
            el.data('remaining', rem);
        },
        putPoolSetpoint: function (setPoint) {
            var self = this, o = self.options, el = self.element;
            $.putApiService('state/chlorinator/poolSetpoint', { id: parseInt(el.attr('data-id'), 10), setPoint: setPoint }, function () { });

        },
        putSpaSetpoint: function (setPoint) {
            var self = this, o = self.options, el = self.element;
            $.putApiService('state/chlorinator/spaSetpoint', { id: parseInt(el.attr('data-id'), 10), setPoint: setPoint }, function () { });

        },
        putSuperChlorHours: function (hours) {
            var self = this, o = self.options, el = self.element;
            $.putApiService('state/chlorinator/superChlorHours', { id: parseInt(el.attr('data-id'), 10), hours: hours }, function () { });

        },
        putSuperChlorinate: function (bSet) {
            var self = this, o = self.options, el = self.element;
            if (!bSet) el.find('label.picSuperChlor').text('Cancelling...');
            else el.find('label.picSuperChlor').text('Initializing...');
            el.find('div.picToggleSuperChlor > div.picIndicator').attr('data-status', 'pending');
            $.putApiService('state/chlorinator/superChlorinate', { id: parseInt(el.attr('data-id'), 10), superChlorinate: bSet }, function () { });

        },
        _buildPopover: function () {
            var self = this, o = self.options, el = self.element;
            el.on('click', function (evt) {
                $.getApiService('/state/chlorinator/' + el.attr('data-id'), function (data, status, xhr) {
                    console.log(data);
                    var divPopover = $('<div class="picChlorSettings"></div>');
                    divPopover.appendTo(el);
                    divPopover.on('initPopover', function (evt) {
                        let saltReqd = parseFloat(el.attr('data-saltrequired'));
                        if (saltReqd > 0) $('<div class="picSaltReqd"><i class="fas fa-bell"></i><span> Add ' + (saltReqd/40).toFixed(2) + ' 40lb bags of salt</span></div>').appendTo(evt.contents());
                        if (data.body.val === 32 || data.body.val === 0) {
                            let divSetpoint = $('<div class="picPoolSetpoint picSetpoint"><label class="picInline-label picSetpointText">Pool Set Point</label><div class="picValueSpinner" data-bind="poolSetpoint"></div></div>');
                            divSetpoint.appendTo(evt.contents());
                            divSetpoint.find('div.picValueSpinner').each(function () {
                                $(this).valueSpinner({ val: data.poolSetpoint, min: 0, max: 100, step: 1 });
                                $(this).on('change', function (e) { self.putPoolSetpoint(e.value); });
                            });
                        }
                        if (data.body.val === 32 || data.body.val === 1) {
                            // Add in the spa setpoint.
                            let divSetpoint = $('<div class="picSpaSetpoint picSetpoint"><label class="picInline-label picSetpointText">Spa Set Point</label><div class="picValueSpinner" data-bind="spaSetpoint"></div></div>');
                            divSetpoint.appendTo(evt.contents());
                            divSetpoint.find('div.picValueSpinner').each(function () {
                                $(this).valueSpinner({ val: data.spaSetpoint, min: 0, max: 100, step: 1 });
                                $(this).on('change', function (e) { self.putSpaSetpoint(e.value); });
                            });
                        }
                        let divSuperChlorHours = $('<div class="picSuperChlorHours picSetpoint"><label class="picInline-label picSetpointText">Super Chlorinate</label><div class="picValueSpinner" data-bind="superChlorHours"></div><label class="picUnits">Hours</label></div>');
                        divSuperChlorHours.appendTo(evt.contents());
                        divSuperChlorHours.find('div.picValueSpinner').each(function () {
                            $(this).valueSpinner({ val: data.superChlorHours, min: 1, max: 96, step: 1 });
                            $(this).on('change', function (e) { self.putSuperChlorHours(e.value); });
                        });

                        // Add in the super chlorinate button.
                        let btn = $('<div class="picSuperChlorBtn"></div>');
                        btn.appendTo(evt.contents());

                        let toggle = $('<div class="picToggleSuperChlor"></div>');
                        toggle.appendTo(btn);
                        toggle.toggleButton();
                        let lbl = $('<div><div><label class="picSuperChlor">Super Chlorinate</label></div><div class="picSuperChlorRemaining"><span class="picSuperChlorRemaining" data-bind="superChlorRemaining" data-fmttype="duration"></span></div></div>');
                        lbl.appendTo(btn);
                        btn.on('click', function (e) {
                            e.preventDefault();
                            let bSet = makeBool(btn.find('div.picIndicator').attr('data-status') !== 'on');
                            self.putSuperChlorinate(bSet);
                        });
                        if (data.status.val === 128) btn.hide();
                        self.setEquipmentData(data);
                    });
                    divPopover.on('click', function (e) { e.stopImmediatePropagation(); e.preventDefault(); });
                    divPopover.popover({ title: 'Chlorinator Settings', popoverStyle: 'modal', placement: { target: evt.target } });
                    divPopover[0].show(evt.target);
                });
                evt.preventDefault();
                evt.stopImmediatePropagation();
            });
        },
        _buildControls: function() {
            var self = this, o = self.options, el = self.element;
            var div = $('<div class="picChlorinatorState picIndicator"></div>');
            el.attr('data-id', o.id);
            div.appendTo(el);
            div.attr('data-ison', o.currentOutput > 0);
            div.attr('data-status', o.currentOutput > 0 ? 'on' : 'off');

            $('<label class="picChlorinatorName" data-bind="name"></label>').appendTo(el);
            $('<span class="picSaltLevel picData"><label class="picInline-label">Salt</label><span class="picSaltLevel" data-bind="saltLevel" data-fmttype="number" data-fmtmask="#,##0" data-fmtempty="----"></span><label class="picUnits">ppm</label></span>').appendTo(el);
            $('<span class="picCurrentOutput picData"><label class="picInline-label">Output</label><span class="picCurrentOutput" data-bind="currentOutput"></span><label class="picUnits">%</label></span>').appendTo(el);

            $('<div class="picChlorStatus picData"><span class="picStatus" data-bind="status.desc"></span></div>').appendTo(el);
            $('<div class="picSuperChlor picData"><label class="picInline-label">Super Chlor:</label><span class="picSuperChlorRemaining" data-bind="superChlorRemaining" data-fmttype="duration"></span></div>').appendTo(el);
            self.setEquipmentData(o);
            self._buildPopover();
        }
    });
    $.widget('pic.chemController', {
        options: {},
        _create: function () {
            var self = this, o = self.options, el = self.element;
            self._buildControls();
            el[0].setEquipmentData = function (data) { self.setEquipmentData(data); };
        },
        setEquipmentData: function (data) {
            var self = this, o = self.options, el = self.element;
            try {
                if (!data.isActive === false) el.hide();
                else el.show();
                el.find('div.picChemControllerState').attr('data-status', data.currentOutput > 0 ? 'on' : 'off');
                dataBinder.bind(el, data);
                el.attr('data-status', data.status.name);
            }
            catch (err) { console.log({ m: 'Error setting chem controller data', err: err, chlor: data }); }
        },
        _buildPopover: function () {
            var self = this, o = self.options, el = self.element;
            el.on('click', function (evt) {
                $.getApiService('/state/chemController/' + el.attr('data-id'), function (data, status, xhr) {
                    console.log(data);
                    var divPopover = $('<div class="picChemControllerSettings"></div>');
                    divPopover.appendTo(el);
                    divPopover.on('initPopover', function (evt) {
                        var divSettings = $('<div></div>').appendTo(evt.contents()).css({ display: 'inline-block', verticalAlign: 'top', width:'347px' });
                        var divLine = $('<div></div>').appendTo(divSettings);
                        var grpSetpoints = $('<fieldset></fieldset>').css({ display: 'inline-block', verticalAlign: 'top', width:'100%' }).appendTo(divLine);
                        $('<legend></legend>').text('Setpoints').appendTo(grpSetpoints);
                        divLine = $('<div></div>').appendTo(grpSetpoints);
                        $('<div></div>').appendTo(divLine).valueSpinner({ labelText: 'pH', binding: 'pHSetpoint', min: 7.0, max: 7.6, step: .1, units: '', inputAttrs: { maxlength: 4 }, labelAttrs: { style: { marginRight: '.25rem' } } });
                        $('<div></div>').appendTo(divLine).valueSpinner({ labelText: 'ORP', binding: 'orpSetpoint', min: 400, max: 800, step: 10, units: 'mV', inputAttrs: { maxlength: 4 }, labelAttrs: { style: { marginRight: '.25rem', marginLeft:'2rem' } } });

                        divLine = $('<div></div>').appendTo(evt.contents());
                        var grpIndex = $('<fieldset></fieldset>').css({ display: 'inline-block', verticalAlign: 'top', width:'100%' }).appendTo(divLine);
                        $('<legend></legend>').text('Index Values').appendTo(grpIndex);
                        divLine = $('<div></div>').appendTo(grpIndex);
                        $('<div></div>').appendTo(divLine).valueSpinner({ labelText: 'Total Alkalinity', binding: 'alkalinity', min: 25, max: 800, step: 10, units: 'ppm', inputAttrs: { maxlength: 4 }, labelAttrs: { style: { width: '8.3rem', marginRight: '.25rem' } } });
                        divLine = $('<div></div>').appendTo(grpIndex);
                        $('<div></div>').appendTo(divLine).valueSpinner({ labelText: 'Calcium Hardness', binding: 'calciumHardness', min: 25, max: 800, step: 1, units: 'ppm', inputAttrs: { maxlength: 4 }, labelAttrs: { style: { width: '8.3rem', marginRight: '.25rem' } } });
                        divLine = $('<div></div>').appendTo(grpIndex);
                        $('<div></div>').appendTo(divLine).valueSpinner({ labelText: 'Cyanuric Acid', binding: 'cyanuricAcid', min: 0, max: 201, step: 1, units: 'ppm', inputAttrs: { maxlength: 4 }, labelAttrs: { style: { width: '8.3rem', marginRight: '.25rem' } } });

                        var grpLevels = $('<fieldset></fieldset>').css({ display: 'inline-block', verticalAlign: 'top', width:'100%' }).appendTo(evt.contents());
                        $('<legend></legend>').text('Current Levels').appendTo(grpLevels);
                        divLine = $('<div></div>').css({ display: 'inline-block', verticalAlign:'top' }).appendTo(grpLevels);
                        var divVal = $('<div></div>').appendTo(divLine).css({ display: 'inline-block', verticalAlign: 'top', textAlign: 'center' });
                        $('<div></div>').addClass('chem-balance-label').text('Water Balance').appendTo(divVal);
                        $('<div></div>').addClass('chem-balance-value').text(data.saturationIndex.format('#,##0.0')).appendTo(divVal);
                        // A good balanced saturationIndex is between +- 0.3

                        divLine = $('<div></div>').css({ display: 'inline-block', margin: '0px auto' }).appendTo(grpLevels);
                        $('<div></div>').chemTank({ chemType: 'acid', labelText: 'Acid Tank' }).css({ width: '80px', height: '120px' }).appendTo(divLine);
                        $('<div></div>').chemTank({ chemType: 'orp', labelText: 'ORP Tank' }).css({ width: '80px', height: '120px' }).appendTo(divLine);
                        divLine = $('<div></div>').appendTo(grpLevels);
                        $('<div></div>').chemLevel({
                            labelText: 'pH', chemType: 'pH', min: 6.7, max: 8.1,
                            scales: [
                                { class: 'chemLevel-lred', min: 6.7, max: 7.0, labelEnd: '7.0' },
                                { class: 'chemLevel-lyellow', min: 7.0, max: 7.2, labelEnd: '7.2' },
                                { class: 'chemLevel-green', min: 7.2, max: 7.6, labelEnd: '7.6' },
                                { class: 'chemLevel-ryellow', min: 7.6, max: 7.8, labelEnd: '7.8' },
                                { class: 'chemLevel-rred', min: 7.8, max: 8.1, labelEnd: ''}
                            ]
                        }).appendTo(divLine);
                        divLine = $('<div></div>').appendTo(grpLevels);
                        $('<div></div>').chemLevel({
                            labelText: 'ORP', chemType: 'ORP', min: 400, max: 1000,
                            scales: [
                                { class: 'chemLevel-lred', min: 400, max: 500, labelEnd: '500' },
                                { class: 'chemLevel-lyellow', min: 500, max: 650, labelEnd: '650' },
                                { class: 'chemLevel-green', min: 650, max: 800, labelEnd: '800' },
                                { class: 'chemLevel-ryellow', min: 800, max: 900, labelEnd: '900' },
                                { class: 'chemLevel-rred', min: 900, max: 1000, labelEnd: '' }
                            ]
                        }).appendTo(divLine);



                        self.setEquipmentData(data);
                    });
                    divPopover.on('click', function (e) { e.stopImmediatePropagation(); e.preventDefault(); });
                    divPopover.popover({ title: 'Chemistry Settings', popoverStyle: 'modal', placement: { target: evt.target } });
                    divPopover[0].show(evt.target);
                });
                evt.preventDefault();
                evt.stopImmediatePropagation();
            });
        },
        _buildControls: function () {
            var self = this, o = self.options, el = self.element;
            var div = $('<div class="picChemControllerState picIndicator"></div>');
            el.attr('data-id', o.id);
            div.appendTo(el);
            div.attr('data-ison', o.currentOutput > 0);
            div.attr('data-status', o.currentOutput > 0 ? 'on' : 'off');

            $('<label class="picControllerName" data-bind="name"></label>').appendTo(el);
            $('<span class="pHLevel picData"><label class="picInline-label">pH</label><span class="phLevel" data-bind="pHLevel" data-fmttype="number" data-fmtmask="#,##0.0" data-fmtempty="----"></span></span>').appendTo(el);
            $('<span class="orpLevel picData"><label class="picInline-label">ORP</label><span class="orpLevel" data-bind="orpLevel"></span></span>').appendTo(el);
            $('<span class="lsiIndex picData"><label class="picInline-label">Balance</label><span class="saturationIndex" data-bind="saturationIndex"></span></span>').appendTo(el);

            //$('<div class="picChlorStatus picData"><span class="picStatus" data-bind="status.desc"></span></div>').appendTo(el);
            self.setEquipmentData(o);
            self._buildPopover();
        }
    });

})(jQuery);
